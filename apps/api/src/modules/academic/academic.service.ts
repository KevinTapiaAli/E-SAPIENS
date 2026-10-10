import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AcademicCourse,
  AcademicEnrollment,
  AcademicOverview,
  AcademicPerson,
  PublicPage,
  SessionUser,
  WorkspaceRole,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { ProgressService } from './progress.service';
import {
  AcademicCoursesQuery,
  AcademicListQuery,
  AcademicOperationDto,
  AcademicPeopleQuery,
  AcademicRole,
} from './academic.dto';

const courseScope = `($2='administrador' OR ($2='estudiante' AND i.id IS NOT NULL)
 OR ($2='docente' AND EXISTS(SELECT 1 FROM lms.curso_docentes cd WHERE cd.curso_id=c.id AND cd.docente_id=$1)))`;

@Injectable()
export class AcademicService {
  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityService,
    private readonly progress: ProgressService,
  ) {}

  private authorize(user: SessionUser, role: WorkspaceRole): void {
    this.identity.authorize(user, role);
    if (role === 'administrador')
      this.identity.authorize(user, role, 'academic.read');
  }

  async courses(
    user: SessionUser,
    query: AcademicCoursesQuery,
  ): Promise<PublicPage<AcademicCourse>> {
    this.authorize(user, query.role);
    const result = await this.database.query<AcademicCourse>(
      `SELECT c.id,c.titulo AS title,cat.nombre AS category,c.estado AS status,
      CASE WHEN $2='estudiante' THEN i.estado END AS "enrollmentStatus",
      ARRAY(SELECT u.nombres||' '||u.apellidos FROM lms.curso_docentes d JOIN lms.usuarios u ON u.id=d.docente_id WHERE d.curso_id=c.id ORDER BY u.apellidos,u.id) AS teachers,
      CASE WHEN $2<>'estudiante' THEN (SELECT count(*)::int FROM lms.inscripciones ci WHERE ci.curso_id=c.id AND ci.estado='activa') END AS "enrollmentCount",
      (SELECT count(*)::int FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id WHERE l.curso_id=c.id AND l.publicada AND m.publicado) AS "totalLessons",
      CASE WHEN $2='estudiante' THEN (SELECT count(*)::int FROM lms.progreso_lecciones p JOIN lms.lecciones l ON l.id=p.leccion_id JOIN lms.modulos m ON m.id=l.modulo_id WHERE p.inscripcion_id=i.id AND p.completado_en IS NOT NULL AND l.publicada AND m.publicado) END AS "completedLessons"
      FROM lms.cursos c JOIN lms.categorias_curso cat ON cat.id=c.categoria_id
      LEFT JOIN lms.inscripciones i ON i.curso_id=c.id AND i.estudiante_id=$1
      WHERE ${courseScope} AND ($3::text='' OR strpos(lower(c.titulo||' '||cat.nombre),lower($3))>0)
      AND ($4::uuid IS NULL OR (lower(cat.nombre),lower(c.titulo),c.id)>(SELECT lower(cc.nombre),lower(pc.titulo),pc.id FROM lms.cursos pc JOIN lms.categorias_curso cc ON cc.id=pc.categoria_id WHERE pc.id=$4))
      ORDER BY lower(cat.nombre),lower(c.titulo),c.id LIMIT $5`,
      [
        user.id,
        query.role,
        query.q ?? '',
        query.cursor ?? null,
        query.limit + 1,
      ],
    );
    return this.page(result.rows, query.limit);
  }

  async overview(
    user: SessionUser,
    role: AcademicRole,
  ): Promise<AcademicOverview> {
    this.authorize(user, role);
    const courses = await this.courses(user, { role, limit: 4 });
    if (role === AcademicRole.Admin) {
      const result = await this.database.query<{
        pending: number;
        students: number;
        courses: number;
        enrollments: number;
        teachers: number;
        requests: number;
        uncovered: number;
        drafts: number;
        accounts: { label: string; value: number }[];
        publications: { label: string; value: number }[];
      }>(`SELECT
        (SELECT count(*)::int FROM lms.usuarios WHERE estado='pendiente') AS pending,
        (SELECT count(*)::int FROM lms.usuarios u WHERE u.estado='aprobado' AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='estudiante')) AS students,
        (SELECT count(*)::int FROM lms.cursos WHERE estado='publicado') AS courses,
        (SELECT count(*)::int FROM lms.inscripciones WHERE estado='activa') AS enrollments,
        (SELECT count(*)::int FROM lms.usuarios u WHERE u.estado='aprobado' AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='docente')) AS teachers,
        (SELECT count(*)::int FROM lms.solicitudes_inscripcion WHERE estado='pendiente') AS requests,
        (SELECT count(*)::int FROM lms.inscripciones i WHERE i.estado='activa' AND NOT EXISTS(SELECT 1 FROM lms.accesos_modulo a JOIN lms.modulos m ON m.id=a.modulo_id WHERE a.inscripcion_id=i.id AND m.publicado AND a.revocado_en IS NULL AND now()>=a.desde AND now()<a.hasta)) AS uncovered,
        (SELECT count(*)::int FROM lms.cursos WHERE estado IN ('borrador','revision')) AS drafts,
        (SELECT coalesce(jsonb_agg(s),'[]'::jsonb) FROM (SELECT estado AS label,count(*)::int AS value FROM lms.usuarios GROUP BY estado ORDER BY estado) s) AS accounts,
        (SELECT coalesce(jsonb_agg(s),'[]'::jsonb) FROM (SELECT estado AS label,count(*)::int AS value FROM lms.cursos GROUP BY estado ORDER BY estado) s) AS publications`);
      const row = result.rows[0];
      return {
        courses: courses.items,
        metrics: [
          { label: 'Solicitudes pendientes', value: row.pending },
          { label: 'Estudiantes aprobados', value: row.students },
          { label: 'Cursos publicados', value: row.courses },
          { label: 'Matrículas activas', value: row.enrollments },
          { label: 'Docentes aprobados', value: row.teachers },
          { label: 'Inscripciones por revisar', value: row.requests },
          { label: 'Matrículas sin cobertura vigente', value: row.uncovered },
          { label: 'Materias en preparación', value: row.drafts },
        ],
        distribution: row.accounts,
        courseDistribution: row.publications,
        progressSummary: await this.progress.summary(user, role),
      };
    }
    if (role === AcademicRole.Teacher) {
      const result = await this.database.query<{
        courses: number;
        students: number;
        published: number;
        review: number;
      }>(
        `SELECT
        count(*)::int AS courses,count(*) FILTER(WHERE c.estado='publicado')::int AS published,
        count(*) FILTER(WHERE c.estado='revision')::int AS review,
        (SELECT count(DISTINCT i.estudiante_id)::int FROM lms.inscripciones i WHERE i.estado='activa' AND EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=i.curso_id AND d.docente_id=$1)) AS students
        FROM lms.cursos c WHERE EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=c.id AND d.docente_id=$1)`,
        [user.id],
      );
      const row = result.rows[0];
      const distribution = await this.database.query<{
        label: string;
        value: number;
      }>(
        'SELECT c.estado AS label,count(*)::int AS value FROM lms.cursos c JOIN lms.curso_docentes d ON d.curso_id=c.id WHERE d.docente_id=$1 GROUP BY c.estado ORDER BY c.estado',
        [user.id],
      );
      return {
        courses: courses.items,
        metrics: [
          { label: 'Cursos asignados', value: row.courses },
          { label: 'Estudiantes activos', value: row.students },
          { label: 'Cursos publicados', value: row.published },
          { label: 'En revisión', value: row.review },
        ],
        distribution: distribution.rows,
        progressSummary: await this.progress.summary(user, role),
      };
    }
    const result = await this.database.query<{
      courses: number;
      active: number;
      lessons: number;
      completed: number;
    }>(
      `SELECT
      count(*)::int AS courses,count(*) FILTER(WHERE i.estado='activa')::int AS active,
      coalesce(sum((SELECT count(*) FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id WHERE l.curso_id=i.curso_id AND l.publicada AND m.publicado)),0)::int AS lessons,
      coalesce(sum((SELECT count(*) FROM lms.progreso_lecciones p JOIN lms.lecciones l ON l.id=p.leccion_id JOIN lms.modulos m ON m.id=l.modulo_id WHERE p.inscripcion_id=i.id AND p.completado_en IS NOT NULL AND l.publicada AND m.publicado)),0)::int AS completed
      FROM lms.inscripciones i WHERE i.estudiante_id=$1`,
      [user.id],
    );
    const row = result.rows[0];
    return {
      courses: courses.items,
      metrics: [
        { label: 'Cursos inscritos', value: row.courses },
        { label: 'Inscripciones activas', value: row.active },
        { label: 'Lecciones completadas', value: row.completed },
        { label: 'Lecciones publicadas', value: row.lessons },
      ],
      distribution: [
        { label: 'Completadas', value: row.completed },
        {
          label: 'Por completar',
          value: Math.max(0, row.lessons - row.completed),
        },
      ],
    };
  }

  async people(
    user: SessionUser,
    query: AcademicPeopleQuery,
  ): Promise<PublicPage<AcademicPerson>> {
    this.identity.authorize(user, 'administrador', 'academic.read');
    const result = await this.database.query<AcademicPerson>(
      `SELECT u.id,u.nombres AS "firstName",u.apellidos AS "lastName",u.email::text,u.estado AS status,
      ARRAY(SELECT r.codigo FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id ORDER BY r.codigo) AS roles,
      pd.especialidad AS specialty,pd.curriculum_url AS "curriculumUrl",pd.revision_formacion AS "qualificationReview",pd.revisado_en AS "qualificationReviewedAt",pd.revision AS "profileRevision"
      FROM lms.usuarios u LEFT JOIN lms.perfiles_docentes pd ON pd.usuario_id=u.id WHERE ($1::text='' OR strpos(lower(u.nombres||' '||u.apellidos||' '||u.email::text),lower($1))>0)
      AND ($2='todos' OR EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo=$2))
      AND ($3='todos' OR u.estado=$3) AND ($4::uuid IS NULL OR u.id>$4) ORDER BY u.id LIMIT $5`,
      [
        query.q ?? '',
        query.kind,
        query.state,
        query.cursor ?? null,
        query.limit + 1,
      ],
    );
    return this.page(result.rows, query.limit);
  }

  async enrollments(
    user: SessionUser,
    query: AcademicListQuery,
  ): Promise<PublicPage<AcademicEnrollment>> {
    this.identity.authorize(user, 'administrador', 'academic.read');
    const result = await this.database.query<AcademicEnrollment>(
      `SELECT i.id,u.nombres||' '||u.apellidos AS student,c.titulo AS course,i.estado AS status,i.inscrito_en AS "enrolledAt",i.motivo AS reason
      FROM lms.inscripciones i JOIN lms.usuarios u ON u.id=i.estudiante_id JOIN lms.cursos c ON c.id=i.curso_id
      WHERE ($1::text='' OR strpos(lower(u.nombres||' '||u.apellidos||' '||c.titulo),lower($1))>0)
      AND ($2::uuid IS NULL OR i.id>$2) ORDER BY i.id LIMIT $3`,
      [query.q ?? '', query.cursor ?? null, query.limit + 1],
    );
    return this.page(result.rows, query.limit);
  }

  async registerOperation(
    user: SessionUser,
    dto: AcademicOperationDto,
    operation: 'enroll' | 'assign',
  ): Promise<{ message: string; id: string }> {
    this.identity.authorize(
      user,
      'administrador',
      operation === 'enroll' ? 'academic.enroll' : 'academic.assign',
    );
    return this.database.transaction(async (client) => {
      const course = await client.query<{ estado: string }>(
        'SELECT estado FROM lms.cursos WHERE id=$1 FOR SHARE',
        [dto.courseId],
      );
      if (!course.rows[0])
        throw new NotFoundException({
          code: 'COURSE_NOT_FOUND',
          message: 'El curso no existe.',
        });
      if (
        (operation === 'enroll' && course.rows[0].estado !== 'publicado') ||
        course.rows[0].estado === 'archivado'
      )
        throw new ConflictException({
          code: 'COURSE_NOT_AVAILABLE',
          message: 'El estado del curso no permite esta operación.',
        });
      const person = await client.query<{ estado: string }>(
        'SELECT estado FROM lms.usuarios WHERE id=$1 FOR SHARE',
        [dto.personId],
      );
      const role = operation === 'enroll' ? 'estudiante' : 'docente';
      const authorized = await client.query(
        `SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=$1 AND r.codigo=$2
        AND ($2<>'docente' OR EXISTS(SELECT 1 FROM lms.perfiles_docentes WHERE usuario_id=$1))`,
        [dto.personId, role],
      );
      if (person.rows[0]?.estado !== 'aprobado' || !authorized.rowCount)
        throw new ConflictException({
          code: 'PERSON_NOT_ELIGIBLE',
          message: `Selecciona un ${role} aprobado con el perfil correspondiente.`,
        });
      await client.query("SELECT set_config('app.actor_id',$1,true)", [
        user.id,
      ]);
      if (operation === 'enroll') {
        const result = await client.query<{ id: string }>(
          `INSERT INTO lms.inscripciones(estudiante_id,curso_id,motivo) VALUES($1,$2,$3)
          ON CONFLICT(estudiante_id,curso_id) DO NOTHING RETURNING id`,
          [dto.personId, dto.courseId, dto.reason],
        );
        if (result.rows[0])
          return {
            id: result.rows[0].id,
            message:
              'Matrícula registrada. Abre la matrícula para definir los módulos y el plazo de acceso del estudiante.',
          };
        const existing = await client.query<{ id: string; estado: string }>(
          'SELECT id,estado FROM lms.inscripciones WHERE estudiante_id=$1 AND curso_id=$2 FOR UPDATE',
          [dto.personId, dto.courseId],
        );
        if (existing.rows[0]?.estado !== 'activa')
          throw new ConflictException({
            code: 'ENROLLMENT_NOT_ACTIVE',
            message:
              'Ya existe una matrícula inactiva. Requiere revisión antes de reactivarla.',
          });
        return {
          id: existing.rows[0].id,
          message: 'El estudiante ya tiene una matrícula activa en este curso.',
        };
      }
      const profile = await client.query(
        'SELECT especialidad,curriculum_url,revision_formacion,revisado_por,revisado_en FROM lms.perfiles_docentes WHERE usuario_id=$1 FOR SHARE',
        [dto.personId],
      );
      if (
        dto.qualificationConfirmed !== true ||
        !profile.rows[0]?.revisado_en ||
        !profile.rows[0]?.revision_formacion?.trim()
      )
        throw new ConflictException({
          code: 'TEACHER_QUALIFICATION_REQUIRED',
          message:
            'Registra primero la revisión de formación en Docentes y confirma su relación con esta materia.',
        });
      const result = await client.query<{ id: string }>(
        `INSERT INTO lms.curso_docentes(curso_id,docente_id,asignado_por,motivo,formacion_revisada) VALUES($1,$2,$3,$4,$5::jsonb)
        ON CONFLICT(curso_id,docente_id) DO NOTHING RETURNING id`,
        [
          dto.courseId,
          dto.personId,
          user.id,
          dto.reason,
          JSON.stringify(profile.rows[0]),
        ],
      );
      if (result.rows[0])
        return {
          id: result.rows[0].id,
          message: 'Docente asignado. El curso aparece en su portal.',
        };
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM lms.curso_docentes WHERE curso_id=$1 AND docente_id=$2',
        [dto.courseId, dto.personId],
      );
      return {
        id: existing.rows[0].id,
        message: 'El docente ya estaba asignado a este curso.',
      };
    });
  }

  private page<T extends { id: string }>(
    rows: T[],
    limit: number,
  ): PublicPage<T> {
    const items = rows.slice(0, limit);
    return {
      items,
      nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null,
    };
  }
}
