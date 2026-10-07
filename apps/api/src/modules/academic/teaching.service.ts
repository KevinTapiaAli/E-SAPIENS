import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import type {
  PublicPage,
  SessionUser,
  TaskSubmission,
  TeachingCourse,
  TeachingMaterial,
  TeachingTask,
  WorkspaceRole,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import {
  MaterialDto,
  GradeSubmissionDto,
  SubmitTaskDto,
  TaskDto,
  TaskFeedbackDto,
  TeachingQuery,
} from './teaching.dto';

const scope = `($2::text='administrador' OR ($2='docente' AND EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=c.id AND d.docente_id=$1))
 OR ($2='estudiante' AND c.estado='publicado' AND EXISTS(SELECT 1 FROM lms.inscripciones i WHERE i.curso_id=c.id AND i.estudiante_id=$1 AND i.estado='activa')))`;
const taskColumns = `t.id,t.modulo_id AS "moduleId",m.titulo AS module,t.titulo AS title,t.instrucciones AS instructions,
 t.fecha_limite AS "dueAt",t.admite_tardia AS "allowLate",t.max_entregas AS "maxSubmissions",t.publicada AS published,t.revision,
 (SELECT count(*)::int FROM lms.entregas_tarea e JOIN lms.inscripciones i ON i.id=e.inscripcion_id WHERE e.tarea_id=t.id AND ($2<>'estudiante' OR i.estudiante_id=$1)) AS "submissionCount",
 (SELECT count(*)::int FROM lms.entregas_tarea e JOIN lms.inscripciones i ON i.id=e.inscripcion_id WHERE e.tarea_id=t.id AND ($2<>'estudiante' OR i.estudiante_id=$1)
 AND NOT EXISTS(SELECT 1 FROM lms.retroalimentaciones r WHERE r.entrega_id=e.id)) AS "pendingReviews"`;

@Injectable()
export class TeachingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
  ) {}
  private authorize(user: SessionUser, role: WorkspaceRole) {
    this.identity.authorize(
      user,
      role,
      role === 'administrador'
        ? 'academic.read'
        : role === 'docente'
          ? 'teaching.manage'
          : 'classroom.study',
    );
  }
  private url(value: string) {
    if (!value) return null;
    try {
      const u = new URL(value);
      if (u.protocol === 'https:' && !u.username && !u.password) return u.href;
    } catch {
      /* Validación local, nunca se descarga el enlace. */
    }
    throw new BadRequestException({
      code: 'INVALID_RESOURCE_URL',
      message: 'Utiliza un enlace HTTPS válido, sin credenciales.',
    });
  }
  private page<T extends { id: string }>(
    rows: T[],
    limit: number,
  ): PublicPage<T> {
    const items = rows.slice(0, limit);
    return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
  }
  private async writer(
    client: PoolClient,
    user: SessionUser,
    courseId: string,
  ) {
    this.identity.authorize(user, 'docente', 'teaching.manage');
    const result = await client.query(
      `SELECT c.id FROM lms.cursos c JOIN lms.curso_docentes d ON d.curso_id=c.id
      WHERE c.id=$1 AND d.docente_id=$2 AND c.estado<>'archivado' FOR SHARE OF c,d`,
      [courseId, user.id],
    );
    if (!result.rowCount)
      throw new NotFoundException({
        code: 'TEACHING_COURSE_NOT_FOUND',
        message: 'La materia no está disponible para tu perfil docente.',
      });
    await client.query("SELECT set_config('app.actor_id',$1,true)", [user.id]);
  }
  private async module(
    client: PoolClient,
    courseId: string,
    moduleId: string,
    published: boolean,
  ) {
    const r = await client.query(
      'SELECT publicado FROM lms.modulos WHERE id=$1 AND curso_id=$2 FOR SHARE',
      [moduleId, courseId],
    );
    if (!r.rows[0] || (published && !r.rows[0].publicado))
      throw new ConflictException({
        code: 'MODULE_UNAVAILABLE',
        message:
          'Selecciona un módulo de esta materia. Para publicar contenido, el módulo debe estar publicado.',
      });
  }
  private revision(actual: number, expected?: number) {
    if (actual !== expected)
      throw new ConflictException({
        code: 'EDITOR_CONFLICT',
        message:
          'El contenido cambió. Recarga la página antes de guardar nuevamente.',
      });
  }
  async course(
    user: SessionUser,
    courseId: string,
    role: WorkspaceRole,
  ): Promise<TeachingCourse> {
    this.authorize(user, role);
    const result = await this.db.query<{ id: string; title: string }>(
      `SELECT c.id,c.titulo AS title FROM lms.cursos c WHERE c.id=$3 AND ${scope}`,
      [user.id, role, courseId],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'TEACHING_COURSE_NOT_FOUND',
        message: 'La materia no está disponible para tu perfil.',
      });
    const modules = await this.db.query<TeachingCourse['modules'][number]>(
      `SELECT m.id,m.titulo AS title,m.publicado AS published FROM lms.modulos m WHERE m.curso_id=$3
      AND ($2::text<>'estudiante' OR lms.puede_acceder_modulo($1,m.id)) ORDER BY m.orden,m.id`,
      [user.id, role, courseId],
    );
    return { ...result.rows[0], modules: modules.rows };
  }
  async materials(
    user: SessionUser,
    courseId: string,
    q: TeachingQuery,
  ): Promise<PublicPage<TeachingMaterial>> {
    this.authorize(user, q.role);
    const r = await this.db.query<TeachingMaterial>(
      `SELECT a.id,a.modulo_id AS "moduleId",m.titulo AS module,a.titulo AS title,a.tipo AS kind,a.contenido AS content,a.enlace AS url,a.publicado AS published,a.revision
      FROM lms.materiales_docentes a JOIN lms.cursos c ON c.id=a.curso_id JOIN lms.modulos m ON m.id=a.modulo_id
      WHERE c.id=$3 AND ${scope} AND ($2<>'estudiante' OR (a.publicado AND lms.puede_acceder_modulo($1,m.id)))
      AND ($6::text='' OR strpos(lower(a.titulo||' '||m.titulo||' '||a.contenido),lower($6))>0)
      AND ($4::uuid IS NULL OR (m.orden,lower(a.titulo),a.id)>(SELECT pm.orden,lower(pa.titulo),pa.id FROM lms.materiales_docentes pa JOIN lms.modulos pm ON pm.id=pa.modulo_id WHERE pa.id=$4 AND pa.curso_id=$3))
      ORDER BY m.orden,lower(a.titulo),a.id LIMIT $5`,
      [user.id, q.role, courseId, q.cursor ?? null, q.limit + 1, q.q ?? ''],
    );
    return this.page(r.rows, q.limit);
  }
  async saveMaterial(
    user: SessionUser,
    courseId: string,
    id: string | null,
    dto: MaterialDto,
  ) {
    const url = this.url(dto.url);
    if (!dto.content && !url)
      throw new BadRequestException({
        code: 'EMPTY_MATERIAL',
        message: 'Añade contenido o un enlace al material.',
      });
    return this.db.transaction(async (client) => {
      await this.writer(client, user, courseId);
      await this.module(client, courseId, dto.moduleId, dto.published);
      if (id) {
        const old = await client.query(
          'SELECT revision FROM lms.materiales_docentes WHERE id=$1 AND curso_id=$2 FOR UPDATE',
          [id, courseId],
        );
        if (!old.rows[0]) throw new NotFoundException();
        this.revision(old.rows[0].revision, dto.revision);
        await client.query(
          `UPDATE lms.materiales_docentes SET modulo_id=$3,titulo=$4,tipo=$5,contenido=$6,enlace=$7,publicado=$8,editado_por=$9,updated_at=now() WHERE id=$1 AND curso_id=$2`,
          [
            id,
            courseId,
            dto.moduleId,
            dto.title,
            dto.kind,
            dto.content,
            url,
            dto.published,
            user.id,
          ],
        );
      } else
        await client.query(
          `INSERT INTO lms.materiales_docentes(curso_id,modulo_id,titulo,tipo,contenido,enlace,publicado,creado_por,editado_por) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
          [
            courseId,
            dto.moduleId,
            dto.title,
            dto.kind,
            dto.content,
            url,
            dto.published,
            user.id,
          ],
        );
      return {
        message:
          'Material guardado. Su publicación determina si lo ven los estudiantes con acceso al módulo.',
      };
    });
  }
  async tasks(
    user: SessionUser,
    courseId: string,
    q: TeachingQuery,
  ): Promise<PublicPage<TeachingTask>> {
    this.authorize(user, q.role);
    const r = await this.db.query<TeachingTask>(
      `SELECT ${taskColumns} FROM lms.tareas t JOIN lms.cursos c ON c.id=t.curso_id JOIN lms.modulos m ON m.id=t.modulo_id
      WHERE c.id=$3 AND ${scope} AND ($2<>'estudiante' OR (t.publicada AND lms.puede_acceder_modulo($1,m.id)))
      AND ($4::uuid IS NULL OR t.id>$4) ORDER BY t.id LIMIT $5`,
      [user.id, q.role, courseId, q.cursor ?? null, q.limit + 1],
    );
    return this.page(r.rows, q.limit);
  }
  async task(
    user: SessionUser,
    courseId: string,
    id: string,
    role: WorkspaceRole,
  ): Promise<TeachingTask> {
    this.authorize(user, role);
    const r = await this.db.query<TeachingTask>(
      `SELECT ${taskColumns} FROM lms.tareas t JOIN lms.cursos c ON c.id=t.curso_id JOIN lms.modulos m ON m.id=t.modulo_id
      WHERE c.id=$3 AND t.id=$4 AND ${scope} AND ($2<>'estudiante' OR (t.publicada AND lms.puede_acceder_modulo($1,m.id)))`,
      [user.id, role, courseId, id],
    );
    if (!r.rows[0])
      throw new NotFoundException({
        code: 'TASK_NOT_AVAILABLE',
        message: 'La tarea no está disponible para tu perfil y acceso actual.',
      });
    return r.rows[0];
  }
  async saveTask(
    user: SessionUser,
    courseId: string,
    id: string | null,
    dto: TaskDto,
  ) {
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(dto.dueAt))
      throw new BadRequestException({
        code: 'TASK_TIMEZONE_REQUIRED',
        message: 'La fecha límite debe incluir una zona horaria.',
      });
    return this.db.transaction(async (client) => {
      await this.writer(client, user, courseId);
      await this.module(client, courseId, dto.moduleId, dto.published);
      if (id) {
        const old = await client.query(
          'SELECT revision,modulo_id FROM lms.tareas WHERE id=$1 AND curso_id=$2 FOR UPDATE',
          [id, courseId],
        );
        if (!old.rows[0]) throw new NotFoundException();
        this.revision(old.rows[0].revision, dto.revision);
        const attempts = await client.query<{ max: number | null }>(
          'SELECT max(numero) AS max FROM lms.entregas_tarea WHERE tarea_id=$1',
          [id],
        );
        if (
          attempts.rows[0].max &&
          (old.rows[0].modulo_id !== dto.moduleId ||
            dto.maxSubmissions < attempts.rows[0].max)
        )
          throw new ConflictException({
            code: 'TASK_HAS_SUBMISSIONS',
            message:
              'Con entregas registradas, conserva el módulo y un límite que incluya los intentos existentes.',
          });
        await client.query(
          `UPDATE lms.tareas SET modulo_id=$3,titulo=$4,instrucciones=$5,fecha_limite=$6,admite_tardia=$7,max_entregas=$8,publicada=$9,editado_por=$10 WHERE id=$1 AND curso_id=$2`,
          [
            id,
            courseId,
            dto.moduleId,
            dto.title,
            dto.instructions,
            dto.dueAt,
            dto.allowLate,
            dto.maxSubmissions,
            dto.published,
            user.id,
          ],
        );
      } else
        await client.query(
          `INSERT INTO lms.tareas(curso_id,modulo_id,titulo,instrucciones,fecha_limite,admite_tardia,max_entregas,publicada,creado_por,editado_por) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
          [
            courseId,
            dto.moduleId,
            dto.title,
            dto.instructions,
            dto.dueAt,
            dto.allowLate,
            dto.maxSubmissions,
            dto.published,
            user.id,
          ],
        );
      return {
        message: 'Tarea guardada. Las entregas existentes se conservan.',
      };
    });
  }
  async submissions(
    user: SessionUser,
    courseId: string,
    taskId: string,
    q: TeachingQuery,
  ): Promise<PublicPage<TaskSubmission>> {
    await this.task(user, courseId, taskId, q.role);
    const r = await this.db.query<TaskSubmission>(
      `SELECT e.id,e.nota::float8 AS grade,u.nombres||' '||u.apellidos AS student,e.numero AS attempt,e.texto AS text,e.comentario_estudiante AS comment,e.enlace AS url,e.entregado_en AS "submittedAt",
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'teacher',d.nombres||' '||d.apellidos,'comment',r.comentario,'createdAt',r.created_at) ORDER BY r.created_at,r.id)
      FROM lms.retroalimentaciones r JOIN lms.usuarios d ON d.id=r.docente_id WHERE r.entrega_id=e.id),'[]'::jsonb) AS feedback
      FROM lms.entregas_tarea e JOIN lms.inscripciones i ON i.id=e.inscripcion_id JOIN lms.usuarios u ON u.id=i.estudiante_id JOIN lms.cursos c ON c.id=e.curso_id
      WHERE e.tarea_id=$3 AND c.id=$4 AND ${scope} AND ($2<>'estudiante' OR i.estudiante_id=$1)
      AND ($5::uuid IS NULL OR e.id>$5) ORDER BY e.id LIMIT $6`,
      [user.id, q.role, taskId, courseId, q.cursor ?? null, q.limit + 1],
    );
    return this.page(r.rows, q.limit);
  }
  async submit(
    user: SessionUser,
    courseId: string,
    taskId: string,
    dto: SubmitTaskDto,
  ) {
    this.identity.authorize(user, 'estudiante', 'classroom.study');
    const url = this.url(dto.url);
    if (!dto.text && !url)
      throw new BadRequestException({
        code: 'EMPTY_SUBMISSION',
        message:
          'Añade tu trabajo en texto o mediante un enlace, además del comentario opcional.',
      });
    return this.db.transaction(async (client) => {
      await client.query('SELECT id FROM lms.cursos WHERE id=$1 FOR SHARE', [
        courseId,
      ]);
      const enrollment = await client.query<{ id: string }>(
        'SELECT id FROM lms.inscripciones WHERE curso_id=$1 AND estudiante_id=$2 FOR UPDATE',
        [courseId, user.id],
      );
      if (!enrollment.rows[0]) throw new NotFoundException();
      const enrollmentId = enrollment.rows[0].id;
      const repeat = await client.query(
        'SELECT tarea_id,texto,comentario_estudiante,enlace FROM lms.entregas_tarea WHERE inscripcion_id=$1 AND operacion_id=$2',
        [enrollmentId, dto.operationId],
      );
      const text = dto.text || url!;
      if (repeat.rows[0]) {
        const old = repeat.rows[0];
        if (
          old.tarea_id !== taskId ||
          old.texto !== text ||
          old.comentario_estudiante !== dto.comment ||
          old.enlace !== url
        )
          throw new ConflictException({
            code: 'SUBMISSION_CONFLICT',
            message:
              'Este envío ya se utilizó con otro contenido. Recarga la tarea para iniciar otro intento.',
          });
        return {
          message: 'Tu entrega ya estaba registrada. No se duplicó el intento.',
        };
      }
      const task = await client.query<{
        open: boolean;
        available: boolean;
        max_entregas: number;
      }>(
        `SELECT (t.admite_tardia OR now()<=t.fecha_limite) AS open,lms.puede_acceder_modulo($3,t.modulo_id) AS available,t.max_entregas
        FROM lms.tareas t WHERE t.id=$1 AND t.curso_id=$2 AND t.publicada FOR SHARE OF t`,
        [taskId, courseId, user.id],
      );
      if (!task.rows[0]?.available)
        throw new NotFoundException({
          code: 'TASK_NOT_AVAILABLE',
          message: 'Esta tarea no está habilitada para tu matrícula.',
        });
      if (!task.rows[0].open)
        throw new ConflictException({
          code: 'TASK_CLOSED',
          message: 'El plazo de entrega ha terminado.',
        });
      const count = await client.query<{ used: number }>(
        'SELECT count(*)::int AS used FROM lms.entregas_tarea WHERE tarea_id=$1 AND inscripcion_id=$2',
        [taskId, enrollmentId],
      );
      if (count.rows[0].used >= task.rows[0].max_entregas)
        throw new ConflictException({
          code: 'SUBMISSION_LIMIT',
          message: 'Ya utilizaste todos los intentos de esta tarea.',
        });
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      const inserted = await client.query<{ id: string }>(
        'SELECT lms.entregar_tarea($1,$2,$3) AS id',
        [enrollmentId, taskId, text],
      );
      await client.query(
        'UPDATE lms.entregas_tarea SET comentario_estudiante=$2,enlace=$3,operacion_id=$4 WHERE id=$1',
        [inserted.rows[0].id, dto.comment, url, dto.operationId],
      );
      return {
        message:
          'Trabajo y comentario enviados al docente. Puedes consultar tu entrega aquí.',
      };
    });
  }
  async grade(
    user: SessionUser,
    courseId: string,
    taskId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
  ) {
    return this.db.transaction(async (client) => {
      await this.writer(client, user, courseId);
      const result = await client.query<{ grade: number | null }>(
        'SELECT nota::float8 AS grade FROM lms.entregas_tarea WHERE id=$1 AND tarea_id=$2 AND curso_id=$3 FOR UPDATE',
        [submissionId, taskId, courseId],
      );
      if (!result.rows[0])
        throw new NotFoundException({
          code: 'SUBMISSION_NOT_FOUND',
          message: 'Entrega no disponible.',
        });
      const previous = result.rows[0].grade;
      if (previous !== dto.expectedGrade)
        throw new ConflictException({
          code: 'GRADE_CHANGED',
          message:
            'La nota cambió. Actualiza la página antes de volver a calificar.',
        });
      if (previous === dto.grade)
        return { message: 'La nota ya está registrada.' };
      await client.query(
        'UPDATE lms.entregas_tarea SET nota=$2,calificado_por=$3,calificado_en=now() WHERE id=$1',
        [submissionId, dto.grade, user.id],
      );
      await client.query(
        'INSERT INTO lms.historial_calificaciones_entrega(entrega_id,docente_id,nota_anterior,nota_nueva,motivo) VALUES($1,$2,$3,$4,$5)',
        [submissionId, user.id, previous, dto.grade, dto.reason],
      );
      await client.query(
        'INSERT INTO lms.retroalimentaciones(entrega_id,docente_id,comentario,operacion_id) VALUES($1,$2,$3,gen_random_uuid())',
        [
          submissionId,
          user.id,
          `Calificación: ${dto.grade}/100. ${dto.reason}`,
        ],
      );
      return { message: 'Calificación y explicación guardadas.' };
    });
  }

  async feedback(
    user: SessionUser,
    courseId: string,
    taskId: string,
    submissionId: string,
    dto: TaskFeedbackDto,
  ) {
    return this.db.transaction(async (client) => {
      await this.writer(client, user, courseId);
      const submission = await client.query(
        'SELECT id FROM lms.entregas_tarea WHERE id=$1 AND tarea_id=$2 AND curso_id=$3 FOR UPDATE',
        [submissionId, taskId, courseId],
      );
      if (!submission.rowCount) throw new NotFoundException();
      const inserted = await client.query(
        `INSERT INTO lms.retroalimentaciones(entrega_id,docente_id,comentario,operacion_id) VALUES($1,$2,$3,$4) ON CONFLICT(operacion_id) DO NOTHING RETURNING id`,
        [submissionId, user.id, dto.comment, dto.operationId],
      );
      if (!inserted.rowCount) {
        const repeat = await client.query(
          'SELECT id FROM lms.retroalimentaciones WHERE operacion_id=$1 AND entrega_id=$2 AND docente_id=$3 AND comentario=$4',
          [dto.operationId, submissionId, user.id, dto.comment],
        );
        if (!repeat.rowCount)
          throw new ConflictException({
            code: 'FEEDBACK_CONFLICT',
            message: 'La respuesta ya se registró con otro contenido.',
          });
      }
      return { message: 'Comentario enviado al estudiante.' };
    });
  }
}
