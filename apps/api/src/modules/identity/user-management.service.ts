import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from './identity.service';
import { hashPassword } from './password';
import {
  CreateManagedUserDto,
  ManagedUserStateDto,
  TeacherProfileReviewDto,
} from './user-management.dto';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
  ) {}
  private curriculum(value?: string) {
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password)
        return url.href;
    } catch {
      /* Validación local, sin descarga del enlace. */
    }
    throw new ConflictException({
      code: 'INVALID_CURRICULUM_URL',
      message:
        'El enlace al currículum debe ser HTTPS y no incluir credenciales.',
    });
  }
  async reviewTeacher(
    user: SessionUser,
    id: string,
    dto: TeacherProfileReviewDto,
  ) {
    this.identity.authorize(user, 'administrador', 'identity.manage');
    const url = this.curriculum(dto.curriculumUrl);
    return this.db.transaction(async (client) => {
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      const r = await client.query(
        `UPDATE lms.perfiles_docentes SET especialidad=$2,curriculum_url=$3,revision_formacion=$4,revisado_por=$5,revisado_en=now()
        WHERE usuario_id=$1 AND revision=$6 AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=$1 AND r.codigo='docente') RETURNING id`,
        [
          id,
          dto.specialty,
          url,
          dto.qualificationReview,
          user.id,
          dto.revision,
        ],
      );
      if (!r.rowCount)
        throw new ConflictException({
          code: 'TEACHER_REVIEW_CONFLICT',
          message:
            'El perfil no existe o cambió. Recarga los datos del docente.',
        });
      return {
        message:
          'Formación revisada y registrada. Puedes asignar al docente a una materia afín.',
      };
    });
  }
  async create(user: SessionUser, dto: CreateManagedUserDto) {
    this.identity.authorize(user, 'administrador', 'identity.manage');
    if (
      dto.role === 'administrador' &&
      !user.roles.includes('administrador_general')
    )
      throw new ForbiddenException({
        code: 'GENERAL_ADMIN_REQUIRED',
        message:
          'Solo el administrador general puede dar de alta administradores.',
      });
    if (
      dto.role === 'docente' &&
      ((dto.specialty?.trim().length ?? 0) < 3 ||
        (dto.qualificationReview?.trim().length ?? 0) < 10)
    )
      throw new ConflictException({
        code: 'SPECIALTY_REQUIRED',
        message:
          'Indica la especialidad y registra cómo revisaste su formación o currículum (al menos 10 caracteres).',
      });
    const hash = await hashPassword(dto.password);
    const curriculum = this.curriculum(dto.curriculumUrl);
    return this.db.transaction(async (client) => {
      const role = await client.query<{ id: string }>(
        'SELECT id FROM lms.roles WHERE codigo=$1',
        [dto.role],
      );
      if (!role.rows[0])
        throw new ConflictException({
          code: 'ROLE_UNAVAILABLE',
          message: 'El perfil no está configurado.',
        });
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      const id = randomUUID();
      const created = await client.query(
        `INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado,aprobado_por,aprobado_en,motivo_estado)
         VALUES($1,$2,$3,$4,$5,$6,'aprobado',$7,now(),$8) ON CONFLICT(email) DO NOTHING RETURNING id`,
        [
          id,
          dto.email,
          `u-${id}`,
          dto.firstName,
          dto.lastName,
          hash,
          user.id,
          dto.reason,
        ],
      );
      if (!created.rowCount)
        throw new ConflictException({
          code: 'EMAIL_EXISTS',
          message:
            'Ya existe una cuenta con ese correo. No se modificó su acceso.',
        });
      await client.query(
        'INSERT INTO lms.usuario_roles(usuario_id,rol_id,asignado_por) VALUES($1,$2,$3)',
        [id, role.rows[0].id, user.id],
      );
      if (dto.role === 'docente')
        await client.query(
          'INSERT INTO lms.perfiles_docentes(usuario_id,especialidad,curriculum_url,revision_formacion,revisado_por,revisado_en) VALUES($1,$2,$3,$4,$5,now())',
          [
            id,
            dto.specialty!.trim(),
            curriculum,
            dto.qualificationReview!.trim(),
            user.id,
          ],
        );
      await client.query(
        "INSERT INTO lms.historial_estado_usuario(usuario_id,estado_nuevo,responsable_id,motivo) VALUES($1,'aprobado',$2,$3)",
        [id, user.id, dto.reason],
      );
      return {
        message:
          'Cuenta creada y aprobada. Ya puede ingresar con el correo y la contraseña definidos.',
      };
    });
  }
  async state(user: SessionUser, id: string, dto: ManagedUserStateDto) {
    this.identity.authorize(user, 'administrador', 'identity.manage');
    if (id === user.id)
      throw new ConflictException({
        code: 'OWN_ACCOUNT_PROTECTED',
        message:
          'No puedes suspender ni cambiar el estado de tu propia cuenta.',
      });
    return this.db.transaction(async (client) => {
      const result = await client.query<{ estado: string }>(
        'SELECT estado FROM lms.usuarios WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!result.rows[0])
        throw new NotFoundException({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'La cuenta no existe.',
        });
      const roles = await client.query<{ codigo: string }>(
        'SELECT r.codigo FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=$1',
        [id],
      );
      if (
        !roles.rowCount ||
        roles.rows.some((r) => r.codigo === 'administrador_general') ||
        (roles.rows.some((r) => r.codigo === 'administrador') &&
          !user.roles.includes('administrador_general'))
      )
        throw new ForbiddenException({
          code: 'ACCOUNT_PROTECTED',
          message:
            'Este perfil requiere gestión por un administrador general u operador autorizado.',
        });
      if (result.rows[0].estado !== dto.expectedStatus)
        throw new ConflictException({
          code: 'ACCOUNT_CHANGED',
          message: 'La cuenta cambió. Actualiza antes de volver a guardar.',
        });
      if (result.rows[0].estado === dto.status)
        return { message: 'La cuenta ya tiene ese estado.' };
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      await client.query(
        `UPDATE lms.usuarios SET estado=$2,motivo_estado=$3,aprobado_por=CASE WHEN $2='aprobado' THEN $4 ELSE aprobado_por END,aprobado_en=CASE WHEN $2='aprobado' THEN now() ELSE aprobado_en END WHERE id=$1`,
        [id, dto.status, dto.reason, user.id],
      );
      await client.query(
        'INSERT INTO lms.historial_estado_usuario(usuario_id,estado_anterior,estado_nuevo,responsable_id,motivo) VALUES($1,$2,$3,$4,$5)',
        [id, result.rows[0].estado, dto.status, user.id, dto.reason],
      );
      if (dto.status === 'suspendido')
        await client.query(
          'UPDATE lms.sesiones SET revocada_en=now() WHERE usuario_id=$1 AND revocada_en IS NULL',
          [id],
        );
      return {
        message:
          dto.status === 'suspendido'
            ? 'Cuenta suspendida y sesiones cerradas.'
            : 'Cuenta aprobada. Debe iniciar sesión nuevamente.',
      };
    });
  }
}
