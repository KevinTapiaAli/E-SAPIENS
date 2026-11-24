import { BadRequestException, Injectable } from '@nestjs/common';
import type { PersonalAgenda, SessionUser } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { AgendaQuery } from './agenda.dto';

export function calendarDay(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    !/^20\d{2}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new BadRequestException({
      code: 'INVALID_CALENDAR_DATE',
      message: 'Elige una fecha válida entre 2000 y 2099.',
    });
  return parsed;
}
export function agendaPeriod(
  query: AgendaQuery,
  timeZone: string,
  now = new Date(),
) {
  const selected = calendarDay(query.day);
  if (!query.day.startsWith(query.month + '-'))
    throw new BadRequestException({
      code: 'INVALID_CALENDAR_MONTH',
      message: 'La fecha debe pertenecer al mes consultado.',
    });
  let from = new Date(`${query.month}-01T12:00:00Z`);
  let until = new Date(from);
  until.setUTCMonth(until.getUTCMonth() + 1);
  if (query.view === 'week') {
    from = new Date(selected);
    from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));
    until = new Date(from);
    until.setUTCDate(until.getUTCDate() + 7);
  } else if (query.view === 'upcoming') {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const today = ['year', 'month', 'day']
      .map((k) => parts.find((p) => p.type === k)!.value)
      .join('-');
    from = calendarDay(today);
    until = new Date(from);
    until.setUTCDate(until.getUTCDate() + 30);
  }
  const first =
    from.toISOString().slice(0, 10) < '2000-01-01'
      ? '2000-01-01'
      : from.toISOString().slice(0, 10);
  const end =
    until.toISOString().slice(0, 10) > '2100-01-01'
      ? '2100-01-01'
      : until.toISOString().slice(0, 10);
  const last = new Date(`${end}T12:00:00Z`);
  last.setUTCDate(last.getUTCDate() - 1);
  return { from: first, until: end, to: last.toISOString().slice(0, 10) };
}

@Injectable()
export class AgendaService {
  constructor(private readonly db: DatabaseService) {}
  async list(
    user: SessionUser,
    query: AgendaQuery,
    limit = 1000,
  ): Promise<PersonalAgenda> {
    const period = agendaPeriod(query, user.timeZone);
    const result = await this.db.query<PersonalAgenda>(
      `WITH bounds AS (
        SELECT $2::date AS period_start,$3::date AS period_end,
          (now() AT TIME ZONE $4)::date AS today,(now() AT TIME ZONE $4)::date+30 AS upcoming_end
      ), courses AS (
        SELECT c.id,c.titulo FROM lms.cursos c WHERE $5::text='administrador'
        OR ($5='docente' AND EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=c.id AND d.docente_id=$1))
        OR ($5='estudiante' AND c.estado='publicado' AND EXISTS(SELECT 1 FROM lms.inscripciones i WHERE i.curso_id=c.id AND i.estudiante_id=$1 AND i.estado='activa'))
      ), all_events AS (
        SELECT a.id,a.titulo AS title,to_char(a.fecha,'YYYY-MM-DD') AS day,'recordatorio'::text AS kind,a.completado AS done,
          null::uuid AS "courseId",null::text AS course,null::timestamptz AS "occursAt",null::timestamptz AS "endsAt",'Recordatorio personal'::text AS detail,a.id AS "activityId"
        FROM lms.agenda_personal a CROSS JOIN bounds b WHERE a.usuario_id=$1 AND
          ((a.fecha>=b.period_start AND a.fecha<b.period_end) OR (a.fecha>=b.today AND a.fecha<b.upcoming_end))
        UNION ALL
        SELECT t.id,t.titulo,to_char(t.fecha_limite AT TIME ZONE $4,'YYYY-MM-DD'),'tarea',
          ($5='estudiante' AND EXISTS(SELECT 1 FROM lms.entregas_tarea e JOIN lms.inscripciones i ON i.id=e.inscripcion_id WHERE e.tarea_id=t.id AND i.estudiante_id=$1)),
          c.id,c.titulo,t.fecha_limite,null::timestamptz,'Fecha límite de entrega',t.id
        FROM lms.tareas t JOIN courses c ON c.id=t.curso_id CROSS JOIN bounds b
        WHERE t.publicada AND ($5<>'estudiante' OR lms.puede_acceder_modulo($1,t.modulo_id)) AND
          ((t.fecha_limite>=b.period_start::timestamp AT TIME ZONE $4 AND t.fecha_limite<b.period_end::timestamp AT TIME ZONE $4)
          OR (t.fecha_limite>=now() AND t.fecha_limite<b.upcoming_end::timestamp AT TIME ZONE $4))
        UNION ALL
        SELECT sc.id,sc.titulo,to_char(sc.inicia_en AT TIME ZONE $4,'YYYY-MM-DD'),'clase',sc.estado='finalizada',c.id,c.titulo,sc.inicia_en,sc.termina_en,'Clase programada',sc.id
        FROM lms.sesiones_clase sc JOIN courses c ON c.id=sc.curso_id CROSS JOIN bounds b
        WHERE sc.estado<>'cancelada' AND ($5<>'estudiante' OR lms.puede_acceder_modulo($1,sc.modulo_id)) AND
          ((sc.inicia_en>=b.period_start::timestamp AT TIME ZONE $4 AND sc.inicia_en<b.period_end::timestamp AT TIME ZONE $4)
          OR ($6::boolean AND sc.inicia_en>=now() AND sc.inicia_en<b.upcoming_end::timestamp AT TIME ZONE $4))
        UNION ALL
        SELECT e.id,e.titulo,to_char(e.created_at AT TIME ZONE $4,'YYYY-MM-DD'),'evaluacion',
          ($5='estudiante' AND EXISTS(SELECT 1 FROM lms.intentos_evaluacion t JOIN lms.inscripciones i ON i.id=t.inscripcion_id WHERE t.evaluacion_id=e.id AND i.estudiante_id=$1 AND t.estado IN ('entregado','calificado'))),
          c.id,c.titulo,e.created_at,null::timestamptz,'Evaluación disponible. Fecha del registro; no es un plazo de entrega.',e.id
        FROM lms.evaluaciones e JOIN courses c ON c.id=e.curso_id CROSS JOIN bounds b
        WHERE $6 AND e.publicada AND e.tipo='modulo' AND ($5<>'estudiante' OR lms.puede_acceder_modulo($1,e.modulo_id))
          AND (SELECT count(*) FROM lms.evaluacion_preguntas ep WHERE ep.evaluacion_id=e.id) BETWEEN 1 AND 30
          AND NOT EXISTS(SELECT 1 FROM lms.evaluacion_preguntas ep JOIN lms.preguntas p ON p.id=ep.pregunta_id WHERE ep.evaluacion_id=e.id AND p.tipo<>'unica')
          AND e.created_at>=b.period_start::timestamp AT TIME ZONE $4 AND e.created_at<b.period_end::timestamp AT TIME ZONE $4
        UNION ALL
        SELECT t.id,e.titulo||' · vence tu intento',to_char(t.vence_en AT TIME ZONE $4,'YYYY-MM-DD'),'evaluacion',false,
          c.id,c.titulo,t.vence_en,null::timestamptz,'Vencimiento de tu intento en curso',e.id
        FROM lms.intentos_evaluacion t JOIN lms.inscripciones i ON i.id=t.inscripcion_id
          JOIN lms.evaluaciones e ON e.id=t.evaluacion_id JOIN courses c ON c.id=e.curso_id CROSS JOIN bounds b
        WHERE $6 AND $5='estudiante' AND i.estudiante_id=$1 AND t.estado='en_curso' AND t.vence_en>now()
          AND e.publicada AND e.tipo='modulo' AND lms.puede_acceder_modulo($1,e.modulo_id)
          AND ((t.vence_en>=b.period_start::timestamp AT TIME ZONE $4 AND t.vence_en<b.period_end::timestamp AT TIME ZONE $4)
          OR (t.vence_en>=now() AND t.vence_en<b.upcoming_end::timestamp AT TIME ZONE $4))
      ), events AS (SELECT * FROM all_events WHERE $8::text='todos' OR kind=$8), in_period AS (
        SELECT e.* FROM events e CROSS JOIN bounds b WHERE e.day>=to_char(b.period_start,'YYYY-MM-DD') AND e.day<to_char(b.period_end,'YYYY-MM-DD')
          AND (NOT $10::boolean OR (NOT e.done AND (e."occursAt" IS NULL OR e."occursAt">=now())))
      ), counts AS (
        SELECT day,count(*)::int AS count,count(*) FILTER(WHERE NOT done)::int AS pending FROM in_period GROUP BY day
      ), selected AS (SELECT * FROM events WHERE day=$7 ORDER BY "occursAt" NULLS FIRST,kind,lower(title),id LIMIT 100), upcoming AS (
        SELECT e.* FROM events e CROSS JOIN bounds b WHERE NOT e.done
          AND ($6 OR e.kind IN ('tarea','recordatorio')) AND e.day>=to_char(b.today,'YYYY-MM-DD') AND e.day<to_char(b.upcoming_end,'YYYY-MM-DD')
          AND (e."occursAt" IS NULL OR e."occursAt">=now())
        ORDER BY e.day,e."occursAt" NULLS FIRST,e.kind,lower(e.title),e.id LIMIT CASE WHEN $6 THEN 20 ELSE 8 END
      ), period_items AS (SELECT * FROM in_period ORDER BY day,"occursAt" NULLS FIRST,kind,lower(title),id LIMIT $9)
      SELECT coalesce((SELECT jsonb_agg(counts ORDER BY day) FROM counts),'[]') AS days,
        coalesce((SELECT jsonb_agg(selected ORDER BY "occursAt" NULLS FIRST,kind,lower(title),id) FROM selected),'[]') AS events,
        coalesce((SELECT jsonb_agg(upcoming ORDER BY day,"occursAt" NULLS FIRST,kind,lower(title),id) FROM upcoming),'[]') AS upcoming,
        (SELECT count(*)::int FROM events WHERE day=$7) AS total,
        coalesce((SELECT jsonb_agg(period_items ORDER BY day,"occursAt" NULLS FIRST,kind,lower(title),id) FROM period_items),'[]') AS "periodEvents",
        jsonb_build_object('from',$2::text,'to',to_char($3::date-1,'YYYY-MM-DD'),'total',(SELECT count(*)::int FROM in_period),'limit',$9::int) AS period`,
      [
        user.id,
        period.from,
        period.until,
        user.timeZone,
        query.role,
        !!query.view,
        query.day,
        query.type ?? 'todos',
        limit,
        query.view === 'upcoming',
      ],
    );
    const row = result.rows[0];
    if (!query.view)
      return {
        days: row.days,
        events: row.events,
        upcoming: row.upcoming,
        total: row.total,
      };
    return row;
  }
}
