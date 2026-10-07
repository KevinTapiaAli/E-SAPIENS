// All values are bound parameters. Keep cohort definitions beside their queries.
export const trafficSql = `
WITH visits AS (
  SELECT * FROM lms.web_visits_daily
  WHERE day >= ($1::timestamptz AT TIME ZONE 'UTC')::date
    AND day < ($2::timestamptz AT TIME ZONE 'UTC')::date
), visitors AS (
  SELECT visitor_hash,min(first_seen_at) AS first_seen FROM visits GROUP BY visitor_hash
), prospects AS (
  SELECT visitor_hash,min(first_seen_at) AS first_seen FROM visits
  WHERE course_id IS NOT NULL OR resource IN ('/cursos','/oferta') GROUP BY visitor_hash
), account_requests AS (
  SELECT u.id,u.created_at,u.web_visitor_hash FROM lms.usuarios u
  WHERE u.created_at >= $1::timestamptz AND u.created_at < $2::timestamptz
    AND EXISTS (SELECT 1 FROM lms.historial_estado_usuario h
      WHERE h.usuario_id=u.id AND h.estado_nuevo='pendiente' AND h.motivo='Solicitud de registro web')
), enrollment_requests AS (
  SELECT * FROM lms.solicitudes_inscripcion WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
), top_courses AS (
  SELECT c.id,c.titulo AS title,count(DISTINCT v.visitor_hash)::int AS visitors,
    (SELECT count(*)::int FROM enrollment_requests s WHERE s.curso_id=c.id) AS requests
  FROM visits v JOIN lms.cursos c ON c.id=v.course_id
  GROUP BY c.id ORDER BY visitors DESC,c.titulo,c.id LIMIT 6
), trend AS (
  SELECT to_char(d,'YYYY-MM-DD') AS day,
    CASE WHEN d::date < (SELECT (enabled_at AT TIME ZONE 'UTC')::date FROM lms.web_analytics_config WHERE singleton)
      THEN NULL ELSE count(DISTINCT v.visitor_hash)::int END AS visitors
  FROM generate_series($1::timestamptz AT TIME ZONE 'UTC',
    ($2::timestamptz AT TIME ZONE 'UTC')-interval '1 day',interval '1 day') AS series(d)
  LEFT JOIN visits v ON v.day=d::date GROUP BY d ORDER BY d
)
SELECT
  (SELECT count(*)::int FROM visitors) AS visitors,
  (SELECT count(DISTINCT visitor_hash)::int FROM lms.web_visits_daily
    WHERE day >= ($3::timestamptz AT TIME ZONE 'UTC')::date
      AND day < ($1::timestamptz AT TIME ZONE 'UTC')::date) AS "previousVisitors",
  (SELECT count(*)::int FROM prospects) AS "courseVisitors",
  (SELECT count(*)::int FROM visitors v WHERE EXISTS (
    SELECT 1 FROM account_requests u WHERE u.web_visitor_hash=v.visitor_hash AND u.created_at>=v.first_seen)) AS "accountConversions",
  (SELECT count(*)::int FROM prospects v WHERE EXISTS (
    SELECT 1 FROM enrollment_requests s WHERE s.web_visitor_hash=v.visitor_hash AND s.created_at>=v.first_seen)) AS "enrollmentConversions",
  (SELECT count(*)::int FROM account_requests) AS "accountRequests",
  (SELECT count(*)::int FROM enrollment_requests) AS "enrollmentRequests",
  coalesce((SELECT jsonb_agg(trend ORDER BY day) FROM trend),'[]') AS trend,
  coalesce((SELECT jsonb_agg(top_courses ORDER BY visitors DESC,title,id) FROM top_courses),'[]') AS "topCourses"`;

export const learningSql = `
WITH enrolled AS (
  SELECT u.id,u.nombres||' '||u.apellidos AS name,min(i.inscrito_en) AS enrolled_at,
    (array_agg(i.id ORDER BY i.inscrito_en,i.id))[1] AS enrollment_id
  FROM lms.usuarios u JOIN lms.inscripciones i ON i.estudiante_id=u.id
  WHERE u.estado='aprobado' AND i.estado='activa' AND i.inscrito_en <= $1::timestamptz
  GROUP BY u.id
), activity AS (
  SELECT i.estudiante_id AS id,p.iniciado_en AS at FROM lms.progreso_lecciones p
    JOIN lms.inscripciones i ON i.id=p.inscripcion_id JOIN enrolled s ON s.id=i.estudiante_id
  UNION ALL
  SELECT i.estudiante_id,p.completado_en FROM lms.progreso_lecciones p
    JOIN lms.inscripciones i ON i.id=p.inscripcion_id JOIN enrolled s ON s.id=i.estudiante_id WHERE p.completado_en IS NOT NULL
  UNION ALL
  SELECT i.estudiante_id,e.entregado_en FROM lms.entregas_tarea e
    JOIN lms.inscripciones i ON i.id=e.inscripcion_id JOIN enrolled s ON s.id=i.estudiante_id
  UNION ALL
  SELECT a.usuario_id,sc.inicia_en FROM lms.asistencias a JOIN lms.sesiones_clase sc ON sc.id=a.sesion_id
    JOIN enrolled s ON s.id=a.usuario_id WHERE a.tipo='estudiante'
    AND (a.verificado_por IS NOT NULL OR a.fuente IN ('meet','zoom')) AND sc.estado IN ('en_curso','finalizada')
), last_activity AS (
  SELECT id,max(at) AS last_at,
    bool_or(at >= $1::timestamptz-interval '7 days') AS weekly,
    bool_or(at >= $1::timestamptz-interval '14 days' AND at < $1::timestamptz-interval '7 days') AS previous_weekly
  FROM activity WHERE at <= $1::timestamptz GROUP BY id
), inactive AS (
  SELECT e.*,a.last_at FROM enrolled e LEFT JOIN last_activity a ON a.id=e.id
  WHERE greatest(e.enrolled_at,coalesce(a.last_at,e.enrolled_at)) < $1::timestamptz-interval '14 days'
), attention AS (
  SELECT id,name,last_at AS "lastActivityAt",enrolled_at AS "enrolledAt",enrollment_id AS "enrollmentId"
  FROM inactive ORDER BY last_at NULLS FIRST,enrolled_at,id LIMIT 8
), latest_submissions AS (
  SELECT DISTINCT ON (tarea_id,inscripcion_id) nota FROM lms.entregas_tarea
  ORDER BY tarea_id,inscripcion_id,numero DESC
)
SELECT
  (SELECT count(*)::int FROM enrolled) AS "enrolledStudents",
  (SELECT count(*)::int FROM last_activity WHERE weekly) AS "weeklyActive",
  (SELECT count(*)::int FROM last_activity WHERE previous_weekly) AS "previousWeeklyActive",
  (SELECT count(*)::int FROM inactive) AS "inactiveStudents",
  (SELECT count(*)::int FROM enrolled e WHERE NOT EXISTS(SELECT 1 FROM last_activity a WHERE a.id=e.id)) AS "neverActive",
  (SELECT count(*)::int FROM latest_submissions WHERE nota IS NULL) AS "ungradedSubmissions",
  (SELECT count(*)::int FROM lms.usuarios WHERE estado='pendiente') AS "pendingAccounts",
  (SELECT count(*)::int FROM lms.solicitudes_inscripcion WHERE estado='pendiente') AS "pendingEnrollments",
  (SELECT count(*)::int FROM lms.cursos WHERE estado='publicado') AS "publishedCourses",
  (SELECT count(*)::int FROM lms.cursos c WHERE c.estado='publicado' AND NOT EXISTS(
    SELECT 1 FROM lms.curso_docentes d JOIN lms.usuarios u ON u.id=d.docente_id
    WHERE d.curso_id=c.id AND u.estado='aprobado' AND EXISTS(
      SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id
      WHERE ur.usuario_id=u.id AND r.codigo='docente'))) AS "unassignedCourses",
  coalesce((SELECT jsonb_agg(attention ORDER BY "lastActivityAt" NULLS FIRST,"enrolledAt",id) FROM attention),'[]') AS students`;
