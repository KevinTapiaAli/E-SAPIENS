import { randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  PendingAccount,
  PublicPage,
  SessionUser,
  WorkspaceDashboard,
  WorkspaceRole,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { LoginDto, RegisterDto, ReviewAccountDto } from './identity.dto';
import { dummyPasswordHash, hashPassword, verifyPassword } from './password';
import { tokenDigest } from './identity-security.service';

const identityColumns = `u.id, u.email::text, u.nombres AS "firstName", u.apellidos AS "lastName",u.zona_horaria AS "timeZone",
 ARRAY(SELECT r.codigo FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id ORDER BY r.codigo) AS roles,
 ARRAY(SELECT DISTINCT p.codigo FROM lms.usuario_roles ur JOIN lms.rol_permisos rp ON rp.rol_id=ur.rol_id JOIN lms.permisos p ON p.id=rp.permiso_id WHERE ur.usuario_id=u.id ORDER BY p.codigo) AS permissions`;

@Injectable()
export class IdentityService {
  private readonly dummy = dummyPasswordHash();
  constructor(private readonly database: DatabaseService) {}

  async login(
    dto: LoginDto,
    previousToken?: string,
  ): Promise<{ user: SessionUser; token: string }> {
    const result = await this.database.query<{
      id: string;
      password_hash: string;
      estado: string;
    }>('SELECT id,password_hash,estado FROM lms.usuarios WHERE email=$1', [
      dto.email,
    ]);
    const candidate = result.rows[0];
    const valid = await verifyPassword(
      candidate?.password_hash ?? (await this.dummy),
      dto.password,
    );
    if (!candidate || !valid)
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos.',
      });
    if (candidate.estado !== 'aprobado')
      throw new ForbiddenException({
        code: 'ACCOUNT_NOT_APPROVED',
        message:
          'Tu cuenta no tiene acceso aprobado. Consulta con la administración de E-SAPIENS.',
      });
    const upgradedHash = candidate.password_hash.startsWith('$argon2id$')
      ? null
      : await hashPassword(dto.password);
    const token = randomBytes(32).toString('hex');
    await this.database.transaction(async (client) => {
      // Lock and recheck after the expensive password verification.
      const locked = await client.query<{
        estado: string;
        password_hash: string;
      }>(
        'SELECT estado,password_hash FROM lms.usuarios WHERE id=$1 FOR UPDATE',
        [candidate.id],
      );
      if (
        locked.rows[0]?.estado !== 'aprobado' ||
        locked.rows[0]?.password_hash !== candidate.password_hash
      )
        throw new UnauthorizedException();
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        candidate.id,
      ]);
      if (previousToken)
        await client.query(
          'UPDATE lms.sesiones SET revocada_en=now() WHERE token_hash=$1 AND revocada_en IS NULL',
          [tokenDigest(previousToken)],
        );
      await client.query(
        'UPDATE lms.usuarios SET ultimo_acceso_en=now(),password_hash=coalesce($2,password_hash) WHERE id=$1',
        [candidate.id, upgradedHash],
      );
      await client.query(
        "INSERT INTO lms.sesiones(usuario_id,token_hash,vence_en) VALUES($1,$2,clock_timestamp()+interval '8 hours')",
        [candidate.id, tokenDigest(token)],
      );
    });
    return { token, user: await this.authenticate(token) };
  }

  async authenticate(token?: string): Promise<SessionUser> {
    if (!token) throw new UnauthorizedException();
    const result = await this.database.query<SessionUser>(
      `SELECT ${identityColumns}
      FROM lms.sesiones s JOIN lms.usuarios u ON u.id=s.usuario_id
      WHERE s.token_hash=$1 AND s.revocada_en IS NULL AND s.vence_en>now() AND u.estado='aprobado'`,
      [tokenDigest(token)],
    );
    if (!result.rows[0]) throw new UnauthorizedException();
    return result.rows[0];
  }

  async logout(token?: string): Promise<void> {
    if (token)
      await this.database.query(
        'UPDATE lms.sesiones SET revocada_en=now() WHERE token_hash=$1 AND revocada_en IS NULL',
        [tokenDigest(token)],
      );
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const passwordHash = await hashPassword(dto.password);
    await this.database.transaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO lms.usuarios(email,username,nombres,apellidos,password_hash)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING RETURNING id`,
        [
          dto.email,
          `u-${randomUUID()}`,
          dto.firstName,
          dto.lastName,
          passwordHash,
        ],
      );
      const id = result.rows[0]?.id;
      if (!id) return; // Same response prevents account enumeration; never overwrite an account.
      await client.query("SELECT set_config('app.actor_id',$1,true)", [id]);
      const role = await client.query(
        "INSERT INTO lms.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM lms.roles WHERE codigo='estudiante' RETURNING id",
        [id],
      );
      if (role.rowCount !== 1)
        throw new Error('Identity migration is required');
      await client.query(
        "INSERT INTO lms.historial_estado_usuario(usuario_id,estado_nuevo,motivo) VALUES($1,'pendiente','Solicitud de registro web')",
        [id],
      );
    });
    return {
      message:
        'Si el correo no tenía una cuenta, registramos tu solicitud. La administración debe aprobarla antes de que puedas ingresar.',
    };
  }

  authorize(user: SessionUser, role: WorkspaceRole, permission?: string): void {
    const expected =
      permission ??
      {
        estudiante: 'dashboard.student',
        docente: 'dashboard.teacher',
        administrador: 'dashboard.admin',
      }[role];
    const hasRole =
      role === 'administrador'
        ? user.roles.some((r) =>
            ['administrador', 'administrador_general'].includes(r),
          )
        : user.roles.includes(role);
    if (!hasRole || !user.permissions.includes(expected))
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSION',
        message: 'Tu cuenta no tiene permiso para acceder a esta sección.',
      });
  }

  async dashboard(
    user: SessionUser,
    role: WorkspaceRole,
  ): Promise<WorkspaceDashboard> {
    this.authorize(user, role);
    if (role === 'administrador') {
      const result = await this.database.query<{
        pending: number;
        students: number;
        teachers: number;
      }>(`SELECT
        (SELECT count(*)::int FROM lms.usuarios WHERE estado='pendiente') AS pending,
        (SELECT count(*)::int FROM lms.usuarios u WHERE u.estado='aprobado' AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='estudiante')) AS students,
        (SELECT count(*)::int FROM lms.usuarios u WHERE u.estado='aprobado' AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='docente')) AS teachers`);
      const row = result.rows[0];
      return {
        user,
        role,
        courses: [],
        counts: [
          { label: 'Solicitudes pendientes', value: row.pending },
          { label: 'Estudiantes aprobados', value: row.students },
          { label: 'Docentes aprobados', value: row.teachers },
        ],
      };
    }
    const result = await this.database.query<{
      id: string;
      title: string;
      status: string;
    }>(
      role === 'estudiante'
        ? `SELECT c.id,c.titulo AS title,i.estado AS status FROM lms.inscripciones i JOIN lms.cursos c ON c.id=i.curso_id WHERE i.estudiante_id=$1 ORDER BY i.inscrito_en DESC LIMIT 50`
        : `SELECT c.id,c.titulo AS title,c.estado AS status FROM lms.curso_docentes d JOIN lms.cursos c ON c.id=d.curso_id WHERE d.docente_id=$1 ORDER BY c.titulo,c.id LIMIT 50`,
      [user.id],
    );
    return { user, role, courses: result.rows, counts: [] };
  }

  async pending(
    user: SessionUser,
    cursor?: string,
  ): Promise<PublicPage<PendingAccount>> {
    this.authorize(user, 'administrador', 'identity.review');
    const result = await this.database.query<PendingAccount>(
      `SELECT u.id,u.email::text,u.nombres AS "firstName",u.apellidos AS "lastName",u.created_at AS "requestedAt"
      FROM lms.usuarios u WHERE u.estado='pendiente' AND ($1::uuid IS NULL OR u.id>$1)
      ORDER BY u.id LIMIT 21`,
      [cursor ?? null],
    );
    const items = result.rows.slice(0, 20);
    return { items, nextCursor: result.rows.length > 20 ? items[19].id : null };
  }

  async review(
    user: SessionUser,
    id: string,
    dto: ReviewAccountDto,
  ): Promise<{ message: string }> {
    this.authorize(user, 'administrador', 'identity.review');
    await this.database.transaction(async (client) => {
      const candidate = await client.query<{ estado: string }>(
        'SELECT estado FROM lms.usuarios WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (candidate.rows[0]?.estado !== 'pendiente' || id === user.id)
        throw new ConflictException({
          code: 'ACCOUNT_NOT_PENDING',
          message: 'La solicitud ya fue revisada o no está disponible.',
        });
      const roles = await client.query<{ codigo: string }>(
        'SELECT r.codigo FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=$1',
        [id],
      );
      if (roles.rows.length !== 1 || roles.rows[0].codigo !== 'estudiante')
        throw new ForbiddenException({
          code: 'MANUAL_REVIEW_REQUIRED',
          message: 'Esta cuenta requiere revisión del operador.',
        });
      const state = dto.decision === 'aprobar' ? 'aprobado' : 'rechazado';
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      await client.query(
        `UPDATE lms.usuarios SET estado=$2,motivo_estado=$3,
        aprobado_por=CASE WHEN $2='aprobado' THEN $4::uuid ELSE NULL END,
        aprobado_en=CASE WHEN $2='aprobado' THEN now() ELSE NULL END WHERE id=$1`,
        [id, state, dto.reason, user.id],
      );
      await client.query(
        "INSERT INTO lms.historial_estado_usuario(usuario_id,estado_anterior,estado_nuevo,responsable_id,motivo) VALUES($1,'pendiente',$2,$3,$4)",
        [id, state, user.id, dto.reason],
      );
    });
    return {
      message:
        dto.decision === 'aprobar'
          ? 'Cuenta aprobada. El estudiante ya puede iniciar sesión.'
          : 'Solicitud rechazada.',
    };
  }
}
