import { Injectable } from '@nestjs/common';
import type {
  DataCenterColumn,
  DataCenterCell,
  DataCenterExport,
  DataCenterIndicator,
  DataCenterRecommendation,
  DataCenterResult,
  DataCenterRow,
  DataCenterSummary,
  ExecutiveDashboard,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DataCenterQuery } from './data-center.dto';
import {
  dataCenterCte,
  rowSelects,
  summarySelect,
} from './data-center.queries';
import { trafficSql } from './dashboard.queries';

export const exportLimit = 5000;
export const dataCenterColumns: Record<
  DataCenterIndicator,
  DataCenterColumn[]
> = {
  students: [
    { key: 'course', label: 'Materia' },
    { key: 'state', label: 'Estado de matrícula' },
    { key: 'progress', label: 'Avance', unit: 'percent' },
    { key: 'lessons', label: 'Lecciones publicadas' },
    { key: 'completed', label: 'Lecciones completadas' },
    { key: 'coverage', label: 'Cobertura vigente', unit: 'boolean' },
    { key: 'inactive', label: 'Sin actividad ≥14 días', unit: 'boolean' },
    { key: 'lastActivity', label: 'Última actividad', unit: 'date' },
    { key: 'submissions', label: 'Entregas del período' },
    { key: 'graded', label: 'Calificadas en el período' },
  ],
  courses: [
    { key: 'state', label: 'Estado' },
    { key: 'students', label: 'Estudiantes únicos' },
    { key: 'enrollments', label: 'Matrículas' },
    { key: 'active', label: 'Matrículas activas' },
    { key: 'progress', label: 'Avance promedio', unit: 'percent' },
    { key: 'lessons', label: 'Lecciones publicadas' },
    { key: 'completed', label: 'Completadas por matrículas' },
    { key: 'tasks', label: 'Tareas publicadas' },
    { key: 'submissions', label: 'Entregas del período' },
    { key: 'pending', label: 'Pendientes de revisión' },
    { key: 'teachers', label: 'Docentes habilitados' },
  ],
  teachers: [
    { key: 'state', label: 'Estado de cuenta' },
    { key: 'courses', label: 'Materias asignadas' },
    { key: 'pending', label: 'Pendientes en sus materias' },
    { key: 'graded', label: 'Calificadas por el docente' },
    { key: 'activity', label: 'Retroalimentaciones del período' },
    { key: 'sessions', label: 'Sesiones iniciadas del período' },
  ],
  requests: [
    { key: 'course', label: 'Materia' },
    { key: 'state', label: 'Estado de solicitud' },
    { key: 'requestedAt', label: 'Solicitud registrada', unit: 'date' },
  ],
  traffic: [
    { key: 'visitors', label: 'Visitantes únicos estimados' },
    { key: 'requests', label: 'Solicitudes registradas' },
  ],
};

export function percentage(
  numerator: number,
  denominator: number,
): number | null {
  return denominator > 0
    ? Math.round((1000 * numerator) / denominator) / 10
    : null;
}

export function recommendations(
  summary: DataCenterSummary,
): DataCenterRecommendation[] {
  const result: DataCenterRecommendation[] = [];
  const add = (
    indicator: keyof DataCenterSummary,
    title: string,
    detail: string,
    target: DataCenterRecommendation['target'],
  ) => {
    const value = summary[indicator];
    if (typeof value === 'number' && value > 0)
      result.push({ indicator, value, title, detail, target });
  };
  add(
    'pendingSubmissions',
    'Revisar entregas pendientes',
    'Último intento sin nota por tarea y matrícula; incluye pendientes anteriores al período.',
    'teachers',
  );
  add(
    'inactiveStudents',
    'Realizar seguimiento académico',
    'Estudiantes únicos aprobados con matrícula activa sin lecciones, entregas ni asistencia confirmada durante al menos 14 días. Revisar las circunstancias de acceso.',
    'students',
  );
  add(
    'unassignedCourses',
    'Revisar asignaciones docentes',
    'Materias publicadas sin una cuenta docente aprobada y asignada.',
    'courses',
  );
  add(
    'withoutCoverage',
    'Revisar autorizaciones de acceso',
    'Matrículas activas sin una autorización vigente para al menos un módulo publicado; no equivale a abandono.',
    'students',
  );
  add(
    'pendingRequests',
    'Atender solicitudes de inscripción',
    'Solicitudes que continúan pendientes en el ámbito consultado.',
    'requests',
  );
  if (summary.previousParticipants > summary.activeParticipants) {
    result.push({
      indicator: 'activeParticipants / previousParticipants',
      value: percentage(
        summary.previousParticipants - summary.activeParticipants,
        summary.previousParticipants,
      )!,
      title: 'Disminuyó la participación registrada',
      detail: `${summary.activeParticipants} estudiantes con actividad frente a ${summary.previousParticipants} en el período anterior de igual duración. La variación no identifica sus causas.`,
      target: 'students',
    });
  }
  return result;
}

export function csvCell(value: DataCenterCell | undefined): string {
  let cell = value === null || value === undefined ? '' : String(value);
  // Excel can ignore whitespace/control characters before a formula.
  let start = 0;
  while (
    start < cell.length &&
    (cell.charCodeAt(start) <= 32 || /\s/u.test(cell[start]))
  )
    start++;
  if (/^[=+@-]/u.test(cell.slice(start)) || /^[\t\r\n]/u.test(cell))
    cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}

@Injectable()
export class DataCenterService {
  constructor(private readonly db: DatabaseService) {}

  private period(query: DataCenterQuery) {
    const generatedAt = new Date().toISOString();
    const to = `${generatedAt.slice(0, 10)}T00:00:00.000Z`;
    const days = Number(query.days);
    const from = new Date(Date.parse(to) - days * 86400000).toISOString();
    const previousFrom = new Date(
      Date.parse(from) - days * 86400000,
    ).toISOString();
    return { generatedAt, period: { days, from, to, previousFrom } };
  }

  private async records(
    query: DataCenterQuery,
    limit: number,
    offset: number,
    clock: ReturnType<DataCenterService['period']>,
  ) {
    const order =
      {
        name: 'lower(label)',
        progress: 'progress',
        students: 'students',
        pending: 'pending',
        activity: 'activity',
      }[query.sort] ?? 'lower(label)';
    const direction = query.direction === 'desc' ? 'DESC' : 'ASC';
    const result = await this.db.query<{
      summary: DataCenterSummary;
      total: number;
      items: DataCenterRow[];
      courseComparison: DataCenterResult['courseComparison'];
      requestStates: DataCenterResult['requestStates'];
    }>(
      `${dataCenterCte}, summary AS (${summarySelect}), data_rows AS (${rowSelects[query.indicator]}),
      page AS (SELECT id,label,course_id,courses,cells,row_number() OVER(ORDER BY ${order} ${direction} NULLS LAST,id) AS position
        FROM data_rows ORDER BY ${order} ${direction} NULLS LAST,id LIMIT $14 OFFSET $15)
      SELECT (SELECT value FROM summary) AS summary,(SELECT count(*)::int FROM data_rows) AS total,
        coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',titulo,'students',students,'averageProgress',progress) ORDER BY lower(titulo),id)
          FROM (SELECT id,titulo,students,progress FROM course_measures ORDER BY lower(titulo),id LIMIT 10) comparison),'[]') AS "courseComparison",
        (SELECT jsonb_build_object('pending',count(*) FILTER(WHERE estado='pendiente'),'approved',count(*) FILTER(WHERE estado='aprobada'),'rejected',count(*) FILTER(WHERE estado='rechazada')) FROM selected_requests) AS "requestStates",
        coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'label',label,'courseId',course_id,'courses',courses,'values',cells) ORDER BY position) FROM page),'[]') AS items`,
      [
        null,
        'administrador',
        query.courseId ?? null,
        '',
        query.state,
        null,
        query.stage,
        query.courseState,
        clock.generatedAt,
        clock.period.from,
        clock.period.to,
        clock.period.previousFrom,
        query.requestState,
        limit,
        offset,
      ],
    );
    return result.rows[0];
  }

  async query(query: DataCenterQuery): Promise<DataCenterResult> {
    const clock = this.period(query);
    const [records, traffic, config, options] = await Promise.all([
      this.records(
        query,
        query.pageSize,
        (query.page - 1) * query.pageSize,
        clock,
      ),
      this.db.query<ExecutiveDashboard['traffic']>(trafficSql, [
        clock.period.from,
        clock.period.to,
        clock.period.previousFrom,
        query.courseId ?? null,
      ]),
      this.db.query<{ enabled_at: Date }>(
        'SELECT enabled_at FROM lms.web_analytics_config WHERE singleton',
      ),
      this.db.query<{ id: string; title: string }>(
        'SELECT id,titulo AS title FROM lms.cursos ORDER BY lower(titulo),id LIMIT 501',
      ),
    ]);
    const trackingSince = config.rows[0].enabled_at.toISOString();
    return {
      ...clock,
      trackingSince,
      traffic: traffic.rows[0],
      trafficComparable:
        Date.parse(clock.period.previousFrom) >= Date.parse(trackingSince),
      summary: records.summary,
      recommendations: recommendations(records.summary),
      indicator: query.indicator,
      columns: dataCenterColumns[query.indicator],
      items: records.items,
      page: query.page,
      pageSize: query.pageSize,
      total: records.total,
      courseOptions: options.rows.slice(0, 500),
      courseOptionsTruncated: options.rows.length > 500,
      courseComparison: records.courseComparison,
      requestStates: records.requestStates,
    };
  }

  async export(query: DataCenterQuery): Promise<DataCenterExport> {
    const clock = this.period(query);
    const records = await this.records(query, exportLimit, 0, clock);
    const columns = dataCenterColumns[query.indicator];
    const csv = [
      ['Nombre / día UTC', ...columns.map((c) => c.label), 'Materias asignadas']
        .map(csvCell)
        .join(','),
      ...records.items.map((row) =>
        [
          row.label,
          ...columns.map((c) => row.values[c.key]),
          row.courses.map((c) => c.title).join('; '),
        ]
          .map(csvCell)
          .join(','),
      ),
    ].join('\r\n');
    return {
      filename: `centro-datos-${query.indicator}-${clock.generatedAt.slice(0, 10)}.csv`,
      csv: `\uFEFF${csv}\r\n`,
      rows: records.items.length,
      total: records.total,
      truncated: records.total > exportLimit,
    };
  }
}
