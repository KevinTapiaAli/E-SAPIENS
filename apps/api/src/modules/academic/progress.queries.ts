// El ámbito se aplica antes de agregar o paginar. Nunca se filtran permisos en el navegador.
// $1 actor, $2 rol verificado, $3 materia, $4 búsqueda, $5 estado, $6 matrícula.
export const progressCte = `WITH scoped AS (
  SELECT i.id,i.estudiante_id,i.curso_id,i.estado,i.inscrito_en,
    u.nombres||' '||u.apellidos AS student,u.estado AS account_status,c.titulo AS course
  FROM lms.inscripciones i JOIN lms.usuarios u ON u.id=i.estudiante_id JOIN lms.cursos c ON c.id=i.curso_id
  WHERE ($2::text='administrador' OR ($2='estudiante' AND i.estudiante_id=$1) OR ($2='docente' AND EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=i.curso_id AND d.docente_id=$1)))
    AND ($3::uuid IS NULL OR i.curso_id=$3)
    AND ($4::text='' OR strpos(lower(u.nombres||' '||u.apellidos||' '||c.titulo),lower($4))>0)
    AND ($5::text='todos' OR i.estado::text=$5)
    AND ($6::uuid IS NULL OR i.id=$6)
), lesson_counts AS (
  SELECT l.curso_id,count(*)::int AS total
  FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id
  WHERE l.publicada AND m.publicado AND EXISTS(SELECT 1 FROM scoped s WHERE s.curso_id=l.curso_id)
  GROUP BY l.curso_id
), completions AS (
  SELECT p.inscripcion_id,count(*) FILTER(WHERE p.completado_en IS NOT NULL)::int AS completed,
    max(greatest(p.updated_at,p.completado_en)) AS last_activity
  FROM lms.progreso_lecciones p JOIN scoped s ON s.id=p.inscripcion_id
  JOIN lms.lecciones l ON l.id=p.leccion_id JOIN lms.modulos m ON m.id=l.modulo_id
  WHERE l.publicada AND m.publicado GROUP BY p.inscripcion_id
), measures AS (
  SELECT s.id,s.estudiante_id,s.student,s.curso_id AS "courseId",s.course,s.estado AS "enrollmentStatus",
    s.account_status AS "accountStatus",s.inscrito_en AS "enrolledAt",
    coalesce(l.total,0) AS "totalLessons",coalesce(p.completed,0) AS "completedLessons",p.last_activity AS "lastActivityAt",
    grades.average AS "taskAverage",grades.graded AS "gradedTasks",grades.submitted AS "submittedTasks",
    attendance.attended AS "attendedClasses",attendance.finished AS "finishedClasses",
    EXISTS(SELECT 1 FROM lms.accesos_modulo a JOIN lms.modulos m ON m.id=a.modulo_id
      WHERE a.inscripcion_id=s.id AND m.publicado AND a.revocado_en IS NULL AND now()>=a.desde AND now()<a.hasta) AS "hasCoverage"
  FROM scoped s LEFT JOIN lesson_counts l ON l.curso_id=s.curso_id LEFT JOIN completions p ON p.inscripcion_id=s.id
  LEFT JOIN LATERAL (
    SELECT round(avg(e.nota)::numeric,1)::float8 AS average,count(e.nota)::int AS graded,count(*)::int AS submitted
    FROM (SELECT DISTINCT ON(e.tarea_id) e.nota FROM lms.entregas_tarea e JOIN lms.tareas t ON t.id=e.tarea_id
      WHERE e.inscripcion_id=s.id AND t.publicada ORDER BY e.tarea_id,e.numero DESC) e
  ) grades ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS finished,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM lms.asistencias a
      WHERE a.sesion_id=sc.id AND a.usuario_id=s.estudiante_id AND (a.verificado_por IS NOT NULL OR a.fuente::text IN ('meet','zoom'))))::int AS attended
    FROM lms.sesiones_clase sc WHERE sc.curso_id=s.curso_id AND sc.estado='finalizada' AND sc.inicia_en>=s.inscrito_en
  ) attendance ON true
), progress AS (
  SELECT *,CASE WHEN "totalLessons"=0 THEN NULL ELSE round(100.0*"completedLessons"/"totalLessons")::int END AS percent,
    CASE WHEN "totalLessons"=0 THEN 'sin_contenido' WHEN "completedLessons"=0 THEN 'sin_iniciar'
      WHEN "completedLessons"="totalLessons" THEN 'completado' ELSE 'en_curso' END AS stage,
    ("enrollmentStatus"='activa' AND "totalLessons">"completedLessons"
      AND coalesce("lastActivityAt","enrolledAt")<now()-interval '14 days') AS inactive
  FROM measures
)`;
