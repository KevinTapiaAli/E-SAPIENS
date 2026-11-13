import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SessionUser } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { AcademicListQuery } from './academic.dto';
import {
  CreateOrderDto,
  CreatePlanDto,
  ReportPaymentDto,
  ReviewPaymentDto,
} from './commerce.dto';

@Injectable()
export class CommerceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly config: ConfigService,
  ) {}
  private student(user: SessionUser) {
    this.identity.authorize(user, 'estudiante', 'classroom.study');
  }
  private admin(user: SessionUser) {
    this.identity.authorize(user, 'administrador', 'commerce.manage');
  }
  private instructions() {
    const text = this.config.get<string>('PAYMENT_INSTRUCTIONS')?.trim();
    if (!text)
      throw new ServiceUnavailableException(
        'Los pagos aún no están habilitados. La institución debe configurar PAYMENT_INSTRUCTIONS.',
      );
    return text;
  }
  async plans(user: SessionUser, q: AcademicListQuery) {
    this.student(user);
    const result = await this.db.query(
      `SELECT p.id,p.nombre AS name,p.descripcion AS description,p.precio::text AS price,p.moneda AS currency,p.dias_acceso AS days
       FROM lms.planes_acceso p WHERE p.activo AND p.precio>0 AND ($1::uuid IS NULL OR p.id>$1)
       AND EXISTS(SELECT 1 FROM lms.plan_modulos pm WHERE pm.plan_id=p.id)
       AND NOT EXISTS(SELECT 1 FROM lms.plan_modulos pm JOIN lms.modulos m ON m.id=pm.modulo_id
         JOIN lms.cursos c ON c.id=m.curso_id WHERE pm.plan_id=p.id AND (NOT m.publicado OR c.estado<>'publicado'))
       ORDER BY p.id LIMIT $2`,
      [q.cursor ?? null, q.limit + 1],
    );
    return {
      items: result.rows.slice(0, q.limit),
      nextCursor:
        result.rows.length > q.limit ? result.rows[q.limit - 1].id : null,
      instructions:
        this.config.get<string>('PAYMENT_INSTRUCTIONS')?.trim() || null,
    };
  }
  async createPlan(user: SessionUser, dto: CreatePlanDto) {
    this.admin(user);
    if (Number(dto.price) <= 0)
      throw new ConflictException('El precio debe ser mayor que cero.');
    return this.db.transaction(async (c) => {
      await c.query("SELECT set_config('app.actor_id',$1,true)", [user.id]);
      const course = await c.query(
        "SELECT titulo FROM lms.cursos WHERE id=$1 AND estado='publicado' FOR SHARE",
        [dto.courseId],
      );
      if (!course.rowCount)
        throw new NotFoundException('Selecciona una materia publicada.');
      const modules = await c.query(
        'SELECT id FROM lms.modulos WHERE curso_id=$1 AND publicado ORDER BY id FOR SHARE',
        [dto.courseId],
      );
      if (!modules.rowCount)
        throw new ConflictException('La materia necesita módulos publicados.');
      const result = await c.query(
        `INSERT INTO lms.planes_acceso(nombre,tipo,precio,moneda,dias_acceso,descripcion)
        VALUES($1,'curso',$2,$3,$4,$5) RETURNING id`,
        [dto.name, dto.price, dto.currency, dto.days, course.rows[0].titulo],
      );
      await c.query(
        'INSERT INTO lms.plan_modulos(plan_id,modulo_id) SELECT $1,unnest($2::uuid[])',
        [result.rows[0].id, modules.rows.map((m) => m.id)],
      );
      return {
        message: 'Plan creado con los módulos publicados actuales.',
        id: result.rows[0].id,
      };
    });
  }
  async order(user: SessionUser, dto: CreateOrderDto) {
    this.student(user);
    this.instructions();
    return this.db.transaction(async (c) => {
      // Serializes repeated checkout requests from the same account.
      await c.query('SELECT id FROM lms.usuarios WHERE id=$1 FOR UPDATE', [
        user.id,
      ]);
      const existing = await c.query(
        'SELECT usuario_id FROM lms.ordenes WHERE id=$1',
        [dto.operationId],
      );
      if (existing.rowCount) {
        const match = await c.query(
          'SELECT 1 FROM lms.orden_detalles WHERE orden_id=$1 AND plan_id=$2',
          [dto.operationId, dto.planId],
        );
        if (existing.rows[0].usuario_id !== user.id || !match.rowCount)
          throw new ConflictException('La clave de compra ya fue utilizada.');
        return {
          message: 'Orden registrada. Consulta tus compras.',
          id: dto.operationId,
        };
      }
      const plan = await c.query(
        `SELECT p.id FROM lms.planes_acceso p WHERE p.id=$1 AND p.activo AND p.precio>0
        AND EXISTS(SELECT 1 FROM lms.plan_modulos WHERE plan_id=p.id)
        AND NOT EXISTS(SELECT 1 FROM lms.plan_modulos pm JOIN lms.modulos m ON m.id=pm.modulo_id
        JOIN lms.cursos curso ON curso.id=m.curso_id WHERE pm.plan_id=p.id AND (NOT m.publicado OR curso.estado<>'publicado'))
        FOR SHARE`,
        [dto.planId],
      );
      if (!plan.rowCount)
        throw new NotFoundException('El plan ya no está disponible.');
      const pending = await c.query(
        `SELECT o.id FROM lms.ordenes o JOIN lms.orden_detalles d ON d.orden_id=o.id
        WHERE o.usuario_id=$1 AND d.plan_id=$2 AND o.estado='pendiente' AND o.vence_en>now() LIMIT 1`,
        [user.id, dto.planId],
      );
      if (pending.rowCount)
        return {
          message: 'Ya tienes una orden pendiente para este plan.',
          id: pending.rows[0].id,
        };
      await c.query("SELECT set_config('app.actor_id',$1,true)", [user.id]);
      await c.query('SELECT lms.crear_orden($1,ARRAY[$2]::uuid[],$3)', [
        user.id,
        dto.planId,
        dto.operationId,
      ]);
      return {
        message: 'Orden creada. Registra la referencia antes de 24 horas.',
        id: dto.operationId,
      };
    });
  }
  async orders(user: SessionUser, q: AcademicListQuery) {
    this.student(user);
    const r = await this.db.query(
      `SELECT o.id,o.numero::text AS number,o.estado AS status,o.vence_en AS "expiresAt",
      o.moneda AS currency,coalesce((SELECT sum(d.precio-d.descuento)::text FROM lms.orden_detalles d WHERE d.orden_id=o.id),'0.00') AS total,
      (SELECT string_agg(d.descripcion,', ') FROM lms.orden_detalles d WHERE d.orden_id=o.id) AS description,
      (SELECT p.estado FROM lms.pagos p WHERE p.orden_id=o.id ORDER BY p.created_at DESC,p.id DESC LIMIT 1) AS "paymentStatus",
      (SELECT p.motivo_revision FROM lms.pagos p WHERE p.orden_id=o.id ORDER BY p.created_at DESC,p.id DESC LIMIT 1) AS "reviewReason"
      FROM lms.ordenes o WHERE o.usuario_id=$1 AND ($2::uuid IS NULL OR o.id>$2) ORDER BY o.id LIMIT $3`,
      [user.id, q.cursor ?? null, q.limit + 1],
    );
    return {
      items: r.rows.slice(0, q.limit),
      nextCursor: r.rows.length > q.limit ? r.rows[q.limit - 1].id : null,
    };
  }
  async report(user: SessionUser, orderId: string, dto: ReportPaymentDto) {
    this.student(user);
    this.instructions();
    try {
      return await this.db.transaction(async (c) => {
        const o = await c.query(
          'SELECT * FROM lms.ordenes WHERE id=$1 AND usuario_id=$2 FOR UPDATE',
          [orderId, user.id],
        );
        if (!o.rowCount) throw new NotFoundException('Orden no disponible.');
        if (
          o.rows[0].estado !== 'pendiente' ||
          new Date(o.rows[0].vence_en).getTime() <= Date.now()
        )
          throw new ConflictException('La orden está cerrada o vencida.');
        const pending = await c.query(
          "SELECT referencia_externa FROM lms.pagos WHERE orden_id=$1 AND estado='pendiente'",
          [orderId],
        );
        if (pending.rowCount) {
          if (pending.rows[0].referencia_externa !== dto.reference)
            throw new ConflictException(
              'Ya existe un pago en revisión para esta orden.',
            );
          return { message: 'La referencia ya está en revisión.' };
        }
        await c.query("SELECT set_config('app.actor_id',$1,true)", [user.id]);
        const inserted = await c.query(
          `INSERT INTO lms.pagos(orden_id,proveedor_id,referencia_externa,metodo,monto,moneda)
          SELECT o.id,p.id,$2,$3,v.total,o.moneda FROM lms.ordenes o JOIN lms.v_totales_orden v ON v.orden_id=o.id
          CROSS JOIN lms.proveedores_pago p WHERE o.id=$1 AND p.codigo='manual_institucional' AND p.activo RETURNING id`,
          [orderId, dto.reference, dto.method],
        );
        if (!inserted.rowCount)
          throw new ServiceUnavailableException(
            'El proveedor de pago manual no está habilitado.',
          );
        return {
          message:
            'Referencia recibida. Un administrador verificará el ingreso bancario.',
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException(
          'La referencia ya fue registrada. Contacta a administración si necesitas corregirla.',
        );
      throw error;
    }
  }
  async pending(user: SessionUser, q: AcademicListQuery) {
    this.admin(user);
    const r = await this.db.query(
      `SELECT p.id,p.orden_id AS "orderId",o.numero::text AS number,u.email,
      p.referencia_externa AS reference,p.metodo AS method,p.monto::text AS amount,p.moneda AS currency,
      p.created_at AS "reportedAt",o.vence_en AS "expiresAt"
      FROM lms.pagos p JOIN lms.ordenes o ON o.id=p.orden_id JOIN lms.usuarios u ON u.id=o.usuario_id
      WHERE p.estado='pendiente' AND ($1::uuid IS NULL OR p.id>$1) ORDER BY p.id LIMIT $2`,
      [q.cursor ?? null, q.limit + 1],
    );
    return {
      items: r.rows.slice(0, q.limit),
      nextCursor: r.rows.length > q.limit ? r.rows[q.limit - 1].id : null,
    };
  }
  async review(user: SessionUser, id: string, dto: ReviewPaymentDto) {
    this.admin(user);
    return this.db.transaction(async (c) => {
      // Lock order first, matching report() and the database payment trigger.
      const found = await c.query(
        'SELECT orden_id FROM lms.pagos WHERE id=$1',
        [id],
      );
      if (!found.rowCount) throw new NotFoundException('Pago no encontrado.');
      const order = await c.query(
        'SELECT * FROM lms.ordenes WHERE id=$1 FOR UPDATE',
        [found.rows[0].orden_id],
      );
      if (order.rows[0].usuario_id === user.id)
        throw new ForbiddenException(
          'Otro administrador debe revisar tus pagos.',
        );
      const p = await c.query(
        'SELECT estado FROM lms.pagos WHERE id=$1 FOR UPDATE',
        [id],
      );
      const target = dto.decision === 'confirmar' ? 'confirmado' : 'fallido';
      if (p.rows[0].estado === target)
        return { message: 'La decisión ya fue registrada.' };
      if (p.rows[0].estado !== 'pendiente')
        throw new ConflictException('El pago ya fue revisado.');
      if (
        target === 'confirmado' &&
        (order.rows[0].estado !== 'pendiente' ||
          new Date(order.rows[0].vence_en).getTime() <= Date.now())
      )
        throw new ConflictException(
          'La orden venció o está cerrada. No confirmes el pago; coordina su regularización o devolución.',
        );
      await c.query("SELECT set_config('app.actor_id',$1,true)", [user.id]);
      await c.query(
        `UPDATE lms.pagos SET estado=$2,revisado_por=$3,revisado_en=now(),motivo_revision=$4,
        confirmado_por=CASE WHEN $2='confirmado' THEN $3::uuid END,
        confirmado_en=CASE WHEN $2='confirmado' THEN now() END WHERE id=$1`,
        [id, target, user.id, dto.reason],
      );
      return {
        message:
          target === 'confirmado'
            ? 'Pago confirmado y acceso registrado.'
            : 'Pago rechazado. El estudiante puede consultar el motivo.',
      };
    });
  }
}
