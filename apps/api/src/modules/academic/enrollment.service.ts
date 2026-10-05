import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CourseOffering,
  EnrollmentAccess,
  EnrollmentRequest,
  PublicPage,
  SessionUser,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { AcademicListQuery } from './academic.dto';
import {
  EnrollmentReasonDto,
  GrantAccessDto,
  ReviewEnrollmentDto,
  EnrollmentRequestsQuery,
} from './enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
  ) {}

  async offerings(
    user: SessionUser,
    query: AcademicListQuery,
  ): Promise<PublicPage<CourseOffering>> {
    this.identity.authorize(user, 'estudiante');
    const result = await this.db.query<CourseOffering>(
      `SELECT c.id,c.titulo AS title,c.descripcion AS description,cat.nombre AS category,
       i.estado AS "enrollmentStatus",s.estado AS "requestStatus",s.motivo AS "requestReason"
       FROM lms.cursos c JOIN lms.categorias_curso cat ON cat.id=c.categoria_id
       LEFT JOIN lms.inscripciones i ON i.curso_id=c.id AND i.estudiante_id=$1
       LEFT JOIN lms.solicitudes_inscripcion s ON s.curso_id=c.id AND s.estudiante_id=$1
       WHERE c.estado='publicado' AND ($2::text='' OR strpos(lower(c.titulo||' '||cat.nombre),lower($2))>0)
       AND ($3::uuid IS NULL OR (lower(cat.nombre),lower(c.titulo),c.id)>(SELECT lower(cc.nombre),lower(pc.titulo),pc.id FROM lms.cursos pc JOIN lms.categorias_curso cc ON cc.id=pc.categoria_id WHERE pc.id=$3))
       ORDER BY lower(cat.nombre),lower(c.titulo),c.id LIMIT $4`,
      [user.id, query.q ?? '', query.cursor ?? null, query.limit + 1],
    );
    const items = result.rows.slice(0, query.limit);
    return {
      items,
      nextCursor: result.rows.length > query.limit ? items.at(-1)!.id : null,
    };
  }

  async request(user: SessionUser, courseId: string) {
    this.identity.authorize(user, 'estudiante');
    return this.db.transaction(async (client) => {
      const course = await client.query(
        "SELECT id FROM lms.cursos WHERE id=$1 AND estado='publicado' FOR SHARE",
        [courseId],
      );
      if (!course.rowCount)
        throw new NotFoundException({
          code: 'COURSE_NOT_AVAILABLE',
          message: 'La materia no está disponible para inscripción.',
        });
      const existing = await client.query(
        'SELECT id FROM lms.inscripciones WHERE estudiante_id=$1 AND curso_id=$2',
        [user.id, courseId],
      );
      if (existing.rowCount)
        return {
          message:
            'Ya tienes una matrícula en esta materia. Consulta Mis cursos o contacta con administración.',
        };
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      const result = await client.query(
        `INSERT INTO lms.solicitudes_inscripcion(estudiante_id,curso_id) VALUES($1,$2)
         ON CONFLICT(estudiante_id,curso_id) DO NOTHING RETURNING id`,
        [user.id, courseId],
      );
      return {
        message: result.rowCount
          ? 'Solicitud enviada. El docente de la materia revisará tu inscripción.'
          : 'Tu solicitud ya está registrada. Puedes consultar su estado en esta página.',
      };
    });
  }

  async requests(
    user: SessionUser,
    query: EnrollmentRequestsQuery,
  ): Promise<PublicPage<EnrollmentRequest>> {
    this.identity.authorize(
      user,
      query.role,
      query.role === 'docente' ? 'teaching.enroll' : 'academic.read',
    );
    const result = await this.db.query<EnrollmentRequest>(
      `SELECT s.id,u.nombres||' '||u.apellidos AS student,c.titulo AS course,s.estado AS status,
       s.created_at AS "requestedAt",s.motivo AS reason,i.id AS "enrollmentId"
       FROM lms.solicitudes_inscripcion s JOIN lms.usuarios u ON u.id=s.estudiante_id JOIN lms.cursos c ON c.id=s.curso_id
       LEFT JOIN lms.inscripciones i ON i.estudiante_id=s.estudiante_id AND i.curso_id=s.curso_id
       WHERE ($1::text='' OR strpos(lower(u.nombres||' '||u.apellidos||' '||c.titulo),lower($1))>0)
       AND ($2::uuid IS NULL OR s.id>$2)
       AND ($4::text='administrador' OR EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=s.curso_id AND d.docente_id=$5))
       AND ($6::uuid IS NULL OR s.curso_id=$6) ORDER BY s.id LIMIT $3`,
      [
        query.q ?? '',
        query.cursor ?? null,
        query.limit + 1,
        query.role,
        user.id,
        query.courseId ?? null,
      ],
    );
    const items = result.rows.slice(0, query.limit);
    return {
      items,
      nextCursor: result.rows.length > query.limit ? items.at(-1)!.id : null,
    };
  }

  async review(user: SessionUser, id: string, dto: ReviewEnrollmentDto) {
    this.identity.authorize(user, 'docente', 'teaching.enroll');
    return this.db.transaction(async (client) => {
      const result = await client.query<{
        estudiante_id: string;
        curso_id: string;
        estado: string;
      }>(
        `SELECT s.estudiante_id,s.curso_id,s.estado FROM lms.solicitudes_inscripcion s
         JOIN lms.curso_docentes d ON d.curso_id=s.curso_id AND d.docente_id=$2
         WHERE s.id=$1 FOR UPDATE OF s FOR SHARE OF d`,
        [id, user.id],
      );
      const request = result.rows[0];
      if (!request)
        throw new NotFoundException({
          code: 'REQUEST_NOT_FOUND',
          message: 'La solicitud no existe.',
        });
      if (request.estado !== 'pendiente')
        throw new ConflictException({
          code: 'REQUEST_ALREADY_REVIEWED',
          message: 'Esta solicitud ya fue revisada. Actualiza la página.',
        });
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      let enrollmentId: string | null = null;
      if (dto.decision === 'aprobar') {
        const course = await client.query(
          "SELECT id FROM lms.cursos WHERE id=$1 AND estado='publicado' FOR SHARE",
          [request.curso_id],
        );
        const person = await client.query(
          `SELECT u.id FROM lms.usuarios u WHERE u.id=$1 AND u.estado='aprobado' AND EXISTS(
           SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='estudiante') FOR SHARE OF u`,
          [request.estudiante_id],
        );
        if (!course.rowCount || !person.rowCount)
          throw new ConflictException({
            code: 'ENROLLMENT_NOT_ELIGIBLE',
            message: 'Se requiere estudiante aprobado y curso publicado.',
          });
        await client.query(
          'INSERT INTO lms.inscripciones(estudiante_id,curso_id,motivo) VALUES($1,$2,$3) ON CONFLICT(estudiante_id,curso_id) DO NOTHING',
          [request.estudiante_id, request.curso_id, dto.reason],
        );
        const enrollment = await client.query<{ id: string; estado: string }>(
          'SELECT id,estado FROM lms.inscripciones WHERE estudiante_id=$1 AND curso_id=$2 FOR UPDATE',
          [request.estudiante_id, request.curso_id],
        );
        if (enrollment.rows[0]?.estado !== 'activa')
          throw new ConflictException({
            code: 'ENROLLMENT_NOT_ACTIVE',
            message:
              'La matrícula existente está inactiva y requiere revisión.',
          });
        enrollmentId = enrollment.rows[0].id;
      }
      await client.query(
        'UPDATE lms.solicitudes_inscripcion SET estado=$2,revisado_por=$3,revisado_en=now(),motivo=$4 WHERE id=$1',
        [
          id,
          dto.decision === 'aprobar' ? 'aprobada' : 'rechazada',
          user.id,
          dto.reason,
        ],
      );
      return {
        // El docente no recibe un enlace a operaciones reservadas a administración.
        message: enrollmentId
          ? 'Inscripción aprobada. Administración puede habilitar los módulos y su vigencia en la matrícula.'
          : 'Solicitud rechazada con el motivo registrado.',
      };
    });
  }

  async access(
    user: SessionUser,
    id: string,
    query: AcademicListQuery,
  ): Promise<EnrollmentAccess> {
    this.identity.authorize(user, 'administrador', 'academic.read');
    const result = await this.db.query<{
      id: string;
      curso_id: string;
      student: string;
      course: string;
      status: string;
    }>(
      `SELECT i.id,i.curso_id,u.nombres||' '||u.apellidos AS student,c.titulo AS course,i.estado AS status
       FROM lms.inscripciones i JOIN lms.usuarios u ON u.id=i.estudiante_id JOIN lms.cursos c ON c.id=i.curso_id WHERE i.id=$1`,
      [id],
    );
    const enrollment = result.rows[0];
    if (!enrollment)
      throw new NotFoundException({
        code: 'ENROLLMENT_NOT_FOUND',
        message: 'La matrícula no existe.',
      });
    const modules = await this.db.query<EnrollmentAccess['modules'][number]>(
      'SELECT id,titulo AS title,publicado AS published,orden AS "order" FROM lms.modulos WHERE curso_id=$1 ORDER BY orden',
      [enrollment.curso_id],
    );
    const grants = await this.db.query<EnrollmentAccess['grants'][number]>(
      `SELECT a.id,m.titulo AS module,a.desde AS "startsAt",a.hasta AS "endsAt",a.revocado_en AS "revokedAt",a.motivo AS reason,
       CASE WHEN a.origen_compra_id IS NULL THEN 'institutional' ELSE 'purchase' END AS source
       FROM lms.accesos_modulo a JOIN lms.modulos m ON m.id=a.modulo_id WHERE a.inscripcion_id=$1
       AND ($2::uuid IS NULL OR (a.created_at,a.id)<(SELECT created_at,id FROM lms.accesos_modulo WHERE id=$2 AND inscripcion_id=$1))
       ORDER BY a.created_at DESC,a.id DESC LIMIT $3`,
      [id, query.cursor ?? null, query.limit + 1],
    );
    return {
      id: enrollment.id,
      student: enrollment.student,
      course: enrollment.course,
      status: enrollment.status,
      modules: modules.rows,
      grants: grants.rows.slice(0, query.limit),
      nextGrantCursor:
        grants.rows.length > query.limit
          ? grants.rows[query.limit - 1].id
          : null,
    };
  }

  async grant(user: SessionUser, id: string, dto: GrantAccessDto) {
    this.identity.authorize(user, 'administrador', 'academic.access');
    return this.db.transaction(async (client) => {
      const result = await client.query<{
        curso_id: string;
        estudiante_id: string;
        estado: string;
      }>(
        'SELECT curso_id,estudiante_id,estado FROM lms.inscripciones WHERE id=$1 FOR UPDATE',
        [id],
      );
      const enrollment = result.rows[0];
      if (!enrollment)
        throw new NotFoundException({
          code: 'ENROLLMENT_NOT_FOUND',
          message: 'La matrícula no existe.',
        });
      const payload = JSON.stringify({
        moduleIds: [...dto.moduleIds].sort(),
        days: dto.days,
        reason: dto.reason,
      });
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      // Registro único y comparación del contenido: el mismo ID nunca aplica otra autorización.
      const operation = await client.query(
        `INSERT INTO lms.autorizaciones_academicas(id,inscripcion_id,autorizado_por,solicitud) VALUES($1,$2,$3,$4::jsonb)
         ON CONFLICT(id) DO NOTHING RETURNING id`,
        [dto.operationId, id, user.id, payload],
      );
      if (!operation.rowCount) {
        const repeat = await client.query(
          'SELECT id FROM lms.autorizaciones_academicas WHERE id=$1 AND inscripcion_id=$2 AND autorizado_por=$3 AND solicitud=$4::jsonb',
          [dto.operationId, id, user.id, payload],
        );
        if (!repeat.rowCount)
          throw new ConflictException({
            code: 'OPERATION_CONFLICT',
            message:
              'Esta operación ya se utilizó con otros datos. Inicia una nueva autorización.',
          });
        return {
          message:
            'Esta autorización ya se registró. No se duplicaron los accesos.',
        };
      }
      const eligible = await client.query(
        `SELECT u.id FROM lms.usuarios u JOIN lms.cursos c ON c.id=$2
         WHERE u.id=$1 AND u.estado='aprobado' AND c.estado='publicado'
         AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='estudiante') FOR SHARE OF u,c`,
        [enrollment.estudiante_id, enrollment.curso_id],
      );
      if (enrollment.estado !== 'activa' || !eligible.rowCount)
        throw new ConflictException({
          code: 'ENROLLMENT_NOT_ELIGIBLE',
          message:
            'Se requiere matrícula activa, estudiante aprobado y curso publicado.',
        });
      const modules = await client.query(
        'SELECT id FROM lms.modulos WHERE curso_id=$1 AND id=ANY($2::uuid[]) AND publicado FOR SHARE',
        [enrollment.curso_id, dto.moduleIds],
      );
      if (modules.rowCount !== dto.moduleIds.length)
        throw new ConflictException({
          code: 'INVALID_MODULE_SELECTION',
          message: 'Selecciona módulos publicados de esta materia.',
        });
      await client.query(
        `INSERT INTO lms.accesos_modulo(inscripcion_id,curso_id,modulo_id,autorizado_por,motivo,desde,hasta,autorizacion_id)
         SELECT $1,$2,selected.module_id,$3,$4,now(),now()+($5 * interval '24 hours'),$6 FROM unnest($7::uuid[]) AS selected(module_id)`,
        [
          id,
          enrollment.curso_id,
          user.id,
          dto.reason,
          dto.days,
          dto.operationId,
          dto.moduleIds,
        ],
      );
      return {
        message:
          'Acceso institucional autorizado. Los módulos conservan sus requisitos de avance.',
      };
    });
  }

  async revoke(
    user: SessionUser,
    enrollmentId: string,
    grantId: string,
    dto: EnrollmentReasonDto,
  ) {
    this.identity.authorize(user, 'administrador', 'academic.access');
    return this.db.transaction(async (client) => {
      await client.query(
        'SELECT id FROM lms.inscripciones WHERE id=$1 FOR UPDATE',
        [enrollmentId],
      );
      const result = await client.query<{
        revocado_en: Date | null;
        origen_compra_id: string | null;
      }>(
        'SELECT revocado_en,origen_compra_id FROM lms.accesos_modulo WHERE id=$1 AND inscripcion_id=$2 FOR UPDATE',
        [grantId, enrollmentId],
      );
      const grant = result.rows[0];
      if (!grant)
        throw new NotFoundException({
          code: 'ACCESS_NOT_FOUND',
          message: 'La autorización no existe en esta matrícula.',
        });
      if (grant.origen_compra_id)
        throw new ConflictException({
          code: 'PURCHASE_ACCESS_REVIEW_REQUIRED',
          message:
            'Un acceso de compra debe revisarse en su operación comercial.',
        });
      if (grant.revocado_en)
        return { message: 'Esta autorización ya está revocada.' };
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      await client.query(
        'UPDATE lms.accesos_modulo SET revocado_en=now(),revocado_por=$2,motivo_revocacion=$3 WHERE id=$1',
        [grantId, user.id, dto.reason],
      );
      return {
        message:
          'Autorización revocada. Otras autorizaciones vigentes conservan su validez.',
      };
    });
  }
}
