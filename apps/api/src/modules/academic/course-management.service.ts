import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import type {
  ManagedCourse,
  ManagedLesson,
  ManagedLessonDetail,
  ManagedModule,
  SessionUser,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import {
  CourseEditorDto,
  ModuleEditorDto,
  LessonEditorDto,
  EnrollmentStateDto,
} from './management.dto';

@Injectable()
export class CourseManagementService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
  ) {}
  private conflict(message: string): never {
    throw new ConflictException({ code: 'EDITOR_CONFLICT', message });
  }
  private async lock(client: PoolClient, courseId: string) {
    const result = await client.query<{ revision: number; enrolled: boolean }>(
      `SELECT c.revision,EXISTS(SELECT 1 FROM lms.inscripciones i WHERE i.curso_id=c.id) AS enrolled FROM lms.cursos c WHERE c.id=$1 FOR UPDATE`,
      [courseId],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'COURSE_NOT_FOUND',
        message: 'La materia no existe.',
      });
    return result.rows[0];
  }
  private async category(client: PoolClient, name: string): Promise<string> {
    const normalized = name.trim();
    if (normalized.length < 2) this.conflict('Indica una categoría válida.');
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM lms.categorias_curso WHERE lower(nombre)=lower($1) ORDER BY id LIMIT 1',
      [normalized],
    );
    if (existing.rows[0]) return existing.rows[0].id;
    const slug = `categoria-${createHash('sha256').update(normalized.toLowerCase()).digest('hex').slice(0, 24)}`;
    const inserted = await client.query<{ id: string }>(
      'INSERT INTO lms.categorias_curso AS existing(nombre,slug) VALUES($1,$2) ON CONFLICT(slug) DO UPDATE SET nombre=existing.nombre RETURNING id',
      [normalized, slug],
    );
    return inserted.rows[0].id;
  }
  async read(user: SessionUser, id: string): Promise<ManagedCourse> {
    this.identity.authorize(user, 'administrador', 'academic.read');
    const result = await this.db.query<Omit<ManagedCourse, 'modules'>>(
      `SELECT c.id,c.titulo AS title,cat.nombre AS category,c.descripcion AS description,c.objetivos AS objectives,c.nivel AS level,c.duracion_horas::float AS "durationHours",c.estado AS status,c.revision,
       coalesce(r.completar_lecciones,true) AS "requireLessons",CASE WHEN r.aprobar_examen THEN 'aprobar' WHEN coalesce(r.presentar_examen,true) THEN 'presentar' ELSE 'ninguno' END AS exam,
       EXISTS(SELECT 1 FROM lms.inscripciones i WHERE i.curso_id=c.id) AS enrolled
       FROM lms.cursos c JOIN lms.categorias_curso cat ON cat.id=c.categoria_id LEFT JOIN lms.reglas_curso r ON r.curso_id=c.id WHERE c.id=$1`,
      [id],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'COURSE_NOT_FOUND',
        message: 'La materia no existe.',
      });
    const [modules, lessons] = await Promise.all([
      this.db.query<Omit<ManagedModule, 'lessons'>>(
        'SELECT id,titulo AS title,descripcion AS description,orden AS "order",publicado AS published,revision FROM lms.modulos WHERE curso_id=$1 ORDER BY orden',
        [id],
      ),
      this.db.query<ManagedLesson & { moduleId: string }>(
        'SELECT id,modulo_id AS "moduleId",titulo AS title,tipo AS type,NULL::text AS content,orden AS "order",duracion_minutos AS "durationMinutes",publicada AS published,obligatoria AS required,revision FROM lms.lecciones WHERE curso_id=$1 ORDER BY orden',
        [id],
      ),
    ]);
    return {
      ...result.rows[0],
      modules: modules.rows.map((m) => ({
        ...m,
        lessons: lessons.rows
          .filter((l) => l.moduleId === m.id)
          .map((l) => ({
            id: l.id,
            title: l.title,
            type: l.type,
            content: l.content,
            order: l.order,
            durationMinutes: l.durationMinutes,
            published: l.published,
            required: l.required,
            revision: l.revision,
          })),
      })),
    };
  }
  async create(user: SessionUser, dto: CourseEditorDto) {
    this.identity.authorize(user, 'administrador', 'academic.edit');
    if (dto.status !== 'borrador')
      this.conflict(
        'Crea la materia como borrador y prepara su contenido antes de publicarla.',
      );
    return this.db.transaction(async (client) => {
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      const categoryId = await this.category(client, dto.category);
      const id = randomUUID();
      const slug = `${
        dto.title
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80) || 'curso'
      }-${id.slice(0, 8)}`;
      await client.query(
        `INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,creado_por,motivo_edicion) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          categoryId,
          dto.title.trim(),
          slug,
          dto.description,
          dto.objectives,
          dto.level,
          dto.durationHours,
          user.id,
          dto.reason,
        ],
      );
      await client.query(
        'INSERT INTO lms.reglas_curso(curso_id,completar_lecciones,presentar_examen,aprobar_examen) VALUES($1,$2,$3,$4)',
        [
          id,
          dto.requireLessons,
          dto.exam !== 'ninguno',
          dto.exam === 'aprobar',
        ],
      );
      return {
        message: 'Materia creada como borrador. Añade sus módulos y lecciones.',
        courseId: id,
      };
    });
  }
  async readLesson(
    user: SessionUser,
    courseId: string,
    lessonId: string,
  ): Promise<ManagedLessonDetail> {
    this.identity.authorize(user, 'administrador', 'academic.read');
    const result = await this.db.query<
      ManagedLesson & {
        moduleId: string;
        moduleTitle: string;
        courseTitle: string;
        enrolled: boolean;
      }
    >(
      `SELECT l.id,l.titulo AS title,l.tipo AS type,l.contenido AS content,l.orden AS "order",l.duracion_minutos AS "durationMinutes",l.publicada AS published,l.obligatoria AS required,l.revision,
       l.modulo_id AS "moduleId",m.titulo AS "moduleTitle",c.titulo AS "courseTitle",EXISTS(SELECT 1 FROM lms.inscripciones i WHERE i.curso_id=c.id) AS enrolled
       FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id JOIN lms.cursos c ON c.id=l.curso_id WHERE l.id=$1 AND c.id=$2`,
      [lessonId, courseId],
    );
    const row = result.rows[0];
    if (!row)
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: 'La lección no existe en esta materia.',
      });
    return {
      courseId,
      courseTitle: row.courseTitle,
      moduleId: row.moduleId,
      moduleTitle: row.moduleTitle,
      enrolled: row.enrolled,
      lesson: {
        id: row.id,
        title: row.title,
        type: row.type,
        content: row.content,
        order: row.order,
        durationMinutes: row.durationMinutes,
        published: row.published,
        required: row.required,
        revision: row.revision,
      },
    };
  }
  async save(user: SessionUser, id: string, dto: CourseEditorDto) {
    this.identity.authorize(user, 'administrador', 'academic.edit');
    return this.db.transaction(async (client) => {
      const course = await this.lock(client, id);
      if (course.revision !== dto.revision)
        this.conflict(
          'La materia cambió desde que abriste el editor. Recarga para no sobrescribir cambios.',
        );
      const rules = await client.query<{
        completar_lecciones: boolean;
        presentar_examen: boolean;
        aprobar_examen: boolean;
      }>(
        'SELECT completar_lecciones,presentar_examen,aprobar_examen FROM lms.reglas_curso WHERE curso_id=$1',
        [id],
      );
      const rule = rules.rows[0];
      const ruleChanged =
        (rule?.completar_lecciones ?? true) !== dto.requireLessons ||
        (rule?.presentar_examen ?? true) !== (dto.exam !== 'ninguno') ||
        (rule?.aprobar_examen ?? false) !== (dto.exam === 'aprobar');
      if (course.enrolled && ruleChanged)
        this.conflict(
          'La materia ya tiene matrículas. Conserva sus requisitos y crea otra edición para cambiarlos.',
        );
      if (dto.status === 'publicado') {
        const ready = await client.query(
          `SELECT 1 FROM lms.modulos m JOIN lms.lecciones l ON l.modulo_id=m.id WHERE m.curso_id=$1 AND m.publicado AND l.publicada AND length(btrim(coalesce(l.contenido,'')))>0 LIMIT 1`,
          [id],
        );
        if (!ready.rowCount)
          this.conflict(
            'Publica al menos un módulo y una lección con contenido antes de publicar la materia.',
          );
      }
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      const categoryId = await this.category(client, dto.category);
      await client.query(
        `UPDATE lms.cursos SET categoria_id=$2,titulo=$3,descripcion=$4,objetivos=$5,nivel=$6,duracion_horas=$7,estado=$8,aprobado_por=CASE WHEN $8='publicado' THEN $9 ELSE aprobado_por END,aprobado_en=CASE WHEN $8='publicado' THEN now() ELSE aprobado_en END,motivo_edicion=$10 WHERE id=$1`,
        [
          id,
          categoryId,
          dto.title.trim(),
          dto.description,
          dto.objectives,
          dto.level,
          dto.durationHours,
          dto.status,
          user.id,
          dto.reason,
        ],
      );
      if (!course.enrolled)
        await client.query(
          `INSERT INTO lms.reglas_curso(curso_id,completar_lecciones,presentar_examen,aprobar_examen) VALUES($1,$2,$3,$4) ON CONFLICT(curso_id) DO UPDATE SET completar_lecciones=excluded.completar_lecciones,presentar_examen=excluded.presentar_examen,aprobar_examen=excluded.aprobar_examen`,
          [
            id,
            dto.requireLessons,
            dto.exam !== 'ninguno',
            dto.exam === 'aprobar',
          ],
        );
      return { message: 'Materia y configuración guardadas.' };
    });
  }
  async module(
    user: SessionUser,
    courseId: string,
    moduleId: string | null,
    dto: ModuleEditorDto,
  ) {
    this.identity.authorize(user, 'administrador', 'academic.edit');
    return this.db.transaction(async (client) => {
      const course = await this.lock(client, courseId);
      if (!moduleId && course.enrolled)
        this.conflict(
          'Crea otra edición para añadir módulos a una materia que ya tiene matrículas.',
        );
      if (moduleId) {
        const current = await client.query<{ revision: number; orden: number }>(
          'SELECT revision,orden FROM lms.modulos WHERE id=$1 AND curso_id=$2 FOR UPDATE',
          [moduleId, courseId],
        );
        if (!current.rows[0])
          throw new NotFoundException({
            code: 'MODULE_NOT_FOUND',
            message: 'El módulo no pertenece a esta materia.',
          });
        if (current.rows[0].revision !== dto.revision)
          this.conflict('El módulo cambió. Recarga antes de guardar.');
        if (course.enrolled && current.rows[0].orden !== dto.order)
          this.conflict(
            'No se puede reordenar un temario que ya tiene matrículas.',
          );
      }
      const duplicate = await client.query(
        'SELECT id FROM lms.modulos WHERE curso_id=$1 AND orden=$2 AND ($3::uuid IS NULL OR id<>$3)',
        [courseId, dto.order, moduleId],
      );
      if (duplicate.rowCount)
        this.conflict(
          'Ya existe otro módulo en esa posición. Elige un número libre.',
        );
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      if (moduleId)
        await client.query(
          'UPDATE lms.modulos SET titulo=$2,descripcion=$3,orden=$4,publicado=$5,motivo_edicion=$6 WHERE id=$1',
          [
            moduleId,
            dto.title,
            dto.description,
            dto.order,
            dto.published,
            dto.reason,
          ],
        );
      else
        await client.query(
          'INSERT INTO lms.modulos(curso_id,titulo,descripcion,orden,publicado,motivo_edicion) VALUES($1,$2,$3,$4,$5,$6)',
          [
            courseId,
            dto.title,
            dto.description,
            dto.order,
            dto.published,
            dto.reason,
          ],
        );
      return { message: 'Módulo guardado.' };
    });
  }
  async lesson(
    user: SessionUser,
    courseId: string,
    moduleId: string,
    lessonId: string | null,
    dto: LessonEditorDto,
  ) {
    this.identity.authorize(user, 'administrador', 'academic.edit');
    if (dto.published && !dto.content.trim())
      this.conflict('Escribe el contenido antes de publicar la lección.');
    if (dto.type === 'enlace' && dto.published) {
      try {
        if (new URL(dto.content.trim()).protocol !== 'https:')
          this.conflict('El enlace debe usar HTTPS.');
      } catch {
        this.conflict(
          'Escribe una dirección HTTPS válida como contenido del enlace.',
        );
      }
    }
    return this.db.transaction(async (client) => {
      const course = await this.lock(client, courseId);
      const module = await client.query(
        'SELECT id FROM lms.modulos WHERE id=$1 AND curso_id=$2',
        [moduleId, courseId],
      );
      if (!module.rowCount)
        throw new NotFoundException({
          code: 'MODULE_NOT_FOUND',
          message: 'El módulo no pertenece a esta materia.',
        });
      if (!lessonId && course.enrolled)
        this.conflict(
          'Crea otra edición para añadir lecciones a un temario que ya tiene matrículas.',
        );
      if (lessonId) {
        const current = await client.query<{
          revision: number;
          orden: number;
          obligatoria: boolean;
          tipo: string;
        }>(
          'SELECT revision,orden,obligatoria,tipo FROM lms.lecciones WHERE id=$1 AND modulo_id=$2 AND curso_id=$3 FOR UPDATE',
          [lessonId, moduleId, courseId],
        );
        if (!current.rows[0])
          throw new NotFoundException({
            code: 'LESSON_NOT_FOUND',
            message: 'La lección no pertenece a este módulo.',
          });
        if (current.rows[0].revision !== dto.revision)
          this.conflict('La lección cambió. Recarga antes de guardar.');
        if (
          course.enrolled &&
          (current.rows[0].orden !== dto.order ||
            current.rows[0].obligatoria !== dto.required ||
            current.rows[0].tipo !== dto.type)
        )
          this.conflict(
            'Con matrículas solo puedes corregir el texto y la disponibilidad; conserva tipo, orden y obligatoriedad.',
          );
      }
      const duplicate = await client.query(
        'SELECT id FROM lms.lecciones WHERE modulo_id=$1 AND orden=$2 AND ($3::uuid IS NULL OR id<>$3)',
        [moduleId, dto.order, lessonId],
      );
      if (duplicate.rowCount)
        this.conflict(
          'Ya existe una lección en esa posición. Elige un número libre.',
        );
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      if (lessonId)
        await client.query(
          'UPDATE lms.lecciones SET titulo=$2,tipo=$3,contenido=$4,orden=$5,duracion_minutos=$6,publicada=$7,obligatoria=$8,motivo_edicion=$9 WHERE id=$1',
          [
            lessonId,
            dto.title,
            dto.type,
            dto.content,
            dto.order,
            dto.durationMinutes,
            dto.published,
            dto.required,
            dto.reason,
          ],
        );
      else
        await client.query(
          'INSERT INTO lms.lecciones(curso_id,modulo_id,titulo,tipo,contenido,orden,duracion_minutos,publicada,obligatoria,motivo_edicion) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [
            courseId,
            moduleId,
            dto.title,
            dto.type,
            dto.content,
            dto.order,
            dto.durationMinutes,
            dto.published,
            dto.required,
            dto.reason,
          ],
        );
      return {
        message: 'Lección guardada. El aula utiliza el contenido publicado.',
      };
    });
  }
  async enrollmentState(
    user: SessionUser,
    id: string,
    dto: EnrollmentStateDto,
  ) {
    this.identity.authorize(user, 'administrador', 'academic.enroll');
    return this.db.transaction(async (client) => {
      const result = await client.query<{
        estado: string;
        estudiante_id: string;
      }>(
        'SELECT estado,estudiante_id FROM lms.inscripciones WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!result.rows[0])
        throw new NotFoundException({
          code: 'ENROLLMENT_NOT_FOUND',
          message: 'La matrícula no existe.',
        });
      if (result.rows[0].estado !== dto.expectedStatus)
        this.conflict('La matrícula cambió. Recarga antes de guardar.');
      if (dto.status === 'activa') {
        const userState = await client.query(
          "SELECT id FROM lms.usuarios WHERE id=$1 AND estado='aprobado'",
          [result.rows[0].estudiante_id],
        );
        if (!userState.rowCount)
          this.conflict(
            'Aprueba la cuenta del estudiante antes de reactivar su matrícula.',
          );
      }
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      await client.query(
        "UPDATE lms.inscripciones SET estado=$2,motivo=$3,abandono_en=CASE WHEN $2='abandonada' THEN now() ELSE NULL END WHERE id=$1",
        [id, dto.status, dto.reason],
      );
      return {
        message:
          'Estado de matrícula actualizado. Los períodos de acceso existentes no se amplían ni se reemplazan.',
      };
    });
  }
}
