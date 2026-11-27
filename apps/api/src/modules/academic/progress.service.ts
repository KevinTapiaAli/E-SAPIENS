import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AcademicProgressSummary,
  AcademicReport,
  PublicPage,
  SessionUser,
  StudentProgress,
  StudentProgressDetail,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { ProgressQuery, ReportQuery } from './progress.dto';

import { progressCte } from './progress.queries';

const progressColumns = `id,student,"courseId",course,"enrollmentStatus","accountStatus","enrolledAt",
 "totalLessons","completedLessons","lastActivityAt","hasCoverage",percent,stage,inactive,
 "taskAverage","gradedTasks","submittedTasks","attendedClasses","finishedClasses"`;

@Injectable()
export class ProgressService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
  ) {}

  private authorize(
    user: SessionUser,
    role: 'administrador' | 'docente' | 'estudiante',
  ) {
    this.identity.authorize(
      user,
      role,
      role === 'administrador'
        ? 'academic.read'
        : role === 'docente'
          ? 'dashboard.teacher'
          : 'dashboard.student',
    );
  }

  async list(
    user: SessionUser,
    query: ProgressQuery,
  ): Promise<PublicPage<StudentProgress>> {
    this.authorize(user, query.role);
    const result = await this.db.query<StudentProgress>(
      `${progressCte}
      SELECT ${progressColumns} FROM progress
      WHERE ($7::text='todos' OR stage=$7 OR ($7='sin_actividad' AND inactive) OR ($7='sin_cobertura' AND NOT "hasCoverage"))
        AND ($8::uuid IS NULL OR (CASE WHEN $2='estudiante' THEN lower(course) ELSE lower(student) END,id)>
          (SELECT CASE WHEN $2='estudiante' THEN lower(course) ELSE lower(student) END,id FROM progress WHERE id=$8))
      ORDER BY CASE WHEN $2='estudiante' THEN lower(course) ELSE lower(student) END,id LIMIT $9`,
      [
        user.id,
        query.role,
        query.courseId ?? null,
        query.q ?? '',
        query.state,
        null,
        query.stage,
        query.cursor ?? null,
        query.limit + 1,
      ],
    );
    const items = result.rows.slice(0, query.limit);
    return {
      items,
      nextCursor:
        result.rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async report(user: SessionUser, query: ReportQuery): Promise<AcademicReport> {
    this.authorize(user, query.role);
    const metric = {
      avance: 'percent',
      tareas: '"taskAverage"',
      asistencia: '100.0*"attendedClasses"/nullif("finishedClasses",0)',
      acceso: 'CASE WHEN "hasCoverage" THEN 100 ELSE 0 END',
    }[query.topic];
    const activity = {
      avance: `SELECT p.completado_en AS at FROM lms.progreso_lecciones p JOIN scoped s ON s.id=p.inscripcion_id JOIN lms.lecciones l ON l.id=p.leccion_id JOIN lms.modulos m ON m.id=l.modulo_id WHERE p.completado_en IS NOT NULL AND l.publicada AND m.publicado`,
      tareas: `SELECT e.calificado_en AS at FROM lms.entregas_tarea e JOIN scoped s ON s.id=e.inscripcion_id JOIN lms.tareas t ON t.id=e.tarea_id WHERE e.nota IS NOT NULL AND t.publicada`,
      asistencia: `SELECT sc.inicia_en AS at FROM lms.asistencias a JOIN lms.sesiones_clase sc ON sc.id=a.sesion_id JOIN scoped s ON s.curso_id=sc.curso_id AND s.estudiante_id=a.usuario_id WHERE sc.estado='finalizada' AND sc.inicia_en>=s.inscrito_en AND (a.verificado_por IS NOT NULL OR a.fuente::text IN ('meet','zoom'))`,
      acceso: `SELECT inscrito_en AS at FROM scoped`,
    }[query.topic];
    const result = await this.db.query<AcademicReport>(
      `${progressCte},
      values_by_student AS (SELECT *,(${metric})::float8 AS value FROM progress),
      by_course AS (SELECT course,"courseId",round(avg(value)::numeric,1)::float8 AS value FROM values_by_student GROUP BY course,"courseId" ORDER BY lower(course),"courseId" LIMIT 10),
      activity AS (${activity}),
      months AS (SELECT generate_series(date_trunc('month',now() AT TIME ZONE $7)-interval '5 months',date_trunc('month',now() AT TIME ZONE $7),interval '1 month') AS month),
      history AS (SELECT to_char(m.month,'YYYY-MM') AS label,count(a.at)::int AS value FROM months m LEFT JOIN activity a ON a.at AT TIME ZONE $7>=m.month AND a.at AT TIME ZONE $7<m.month+interval '1 month' GROUP BY m.month ORDER BY m.month)
      SELECT count(*)::int AS total,count(DISTINCT estudiante_id)::int AS students,
        round(avg(value)::numeric,1)::float8 AS average,count(*) FILTER(WHERE inactive)::int AS inactive,
        count(*) FILTER(WHERE value IS NULL)::int AS missing,
        coalesce((SELECT jsonb_agg(jsonb_build_object('label',course,'value',value) ORDER BY lower(course),"courseId") FROM by_course),'[]') AS bars,
        jsonb_build_array(
          jsonb_build_object('label','Sin registro','value',count(*) FILTER(WHERE value IS NULL)),
          jsonb_build_object('label','0–49','value',count(*) FILTER(WHERE value<50)),
          jsonb_build_object('label','50–79','value',count(*) FILTER(WHERE value>=50 AND value<80)),
          jsonb_build_object('label','80–100','value',count(*) FILTER(WHERE value>=80))) AS distribution,
        coalesce((SELECT jsonb_agg(jsonb_build_object('label',label,'value',value) ORDER BY label) FROM history),'[]') AS timeline
      FROM values_by_student`,
      [
        user.id,
        query.role,
        query.courseId ?? null,
        '',
        query.state,
        null,
        user.timeZone,
      ],
    );
    return result.rows[0];
  }

  async summary(
    user: SessionUser,
    role: 'administrador' | 'docente',
  ): Promise<AcademicProgressSummary> {
    this.authorize(user, role);
    const result = await this.db.query<AcademicProgressSummary>(
      `${progressCte}
      SELECT count(*)::int AS enrollments,count(DISTINCT estudiante_id)::int AS students,
        round(avg(100.0*"completedLessons"/nullif("totalLessons",0)))::int AS "averagePercent",
        count(*) FILTER(WHERE stage='sin_iniciar')::int AS "notStarted",
        count(*) FILTER(WHERE stage='en_curso')::int AS "inProgress",
        count(*) FILTER(WHERE stage='completado')::int AS completed,
        count(*) FILTER(WHERE stage='sin_contenido')::int AS "withoutContent",
        count(*) FILTER(WHERE inactive)::int AS inactive,
        count(*) FILTER(WHERE NOT "hasCoverage")::int AS "withoutCoverage"
      FROM progress`,
      [user.id, role, null, '', 'activa', null],
    );
    return result.rows[0];
  }

  async detail(
    user: SessionUser,
    role: 'administrador' | 'docente',
    id: string,
  ): Promise<StudentProgressDetail> {
    this.authorize(user, role);
    const result = await this.db.query<StudentProgress>(
      `${progressCte} SELECT ${progressColumns} FROM progress`,
      [user.id, role, null, '', 'todos', id],
    );
    const enrollment = result.rows[0];
    if (!enrollment)
      throw new NotFoundException({
        code: 'PROGRESS_NOT_FOUND',
        message:
          'La matrícula no existe o no pertenece a tus materias asignadas.',
      });
    const modules = await this.db.query<
      StudentProgressDetail['modules'][number]
    >(
      `
      SELECT m.id,m.titulo AS title,count(l.id)::int AS "totalLessons",
        count(p.id) FILTER(WHERE p.completado_en IS NOT NULL)::int AS "completedLessons",
        max(greatest(p.updated_at,p.completado_en)) AS "lastActivityAt",
        lms.puede_acceder_modulo(i.estudiante_id,m.id) AS available,
        EXISTS(SELECT 1 FROM lms.accesos_modulo a WHERE a.inscripcion_id=i.id AND a.modulo_id=m.id
          AND a.revocado_en IS NULL AND now()>=a.desde AND now()<a.hasta) AS "hasCoverage"
      FROM lms.inscripciones i JOIN lms.modulos m ON m.curso_id=i.curso_id
      LEFT JOIN lms.lecciones l ON l.modulo_id=m.id AND l.publicada
      LEFT JOIN lms.progreso_lecciones p ON p.inscripcion_id=i.id AND p.leccion_id=l.id
      WHERE i.id=$1 AND m.publicado AND ($2::text='administrador' OR EXISTS(
        SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=i.curso_id AND d.docente_id=$3))
      GROUP BY m.id,i.id ORDER BY m.orden,m.id`,
      [id, role, user.id],
    );
    return { enrollment, modules: modules.rows };
  }
}
