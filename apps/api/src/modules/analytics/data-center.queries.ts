import { progressCte } from '../academic/progress.queries';
import { studentActivitySql } from './dashboard.queries';

// $1..$6 reuse the academic progress scope. $7 stage, $8 course state,
// $9 snapshot, $10..$12 equal UTC windows, $13 request state.
export const dataCenterCte = `${progressCte},
selected_courses AS (
  SELECT c.id,c.titulo,c.estado FROM lms.cursos c
  WHERE ($3::uuid IS NULL OR c.id=$3) AND ($8::text='todos' OR c.estado=$8)
), recorded_activity AS (${studentActivitySql}),
last_recorded AS (
  SELECT a.enrollment_id,max(a.at) AS last_at FROM recorded_activity a
  JOIN scoped s ON s.id=a.enrollment_id WHERE a.at<=$9::timestamptz GROUP BY a.enrollment_id
), candidates AS (
  SELECT p.*,a.last_at AS recorded_at,
    (p."enrollmentStatus"='activa' AND p."accountStatus"='aprobado'
      AND greatest(p."enrolledAt",coalesce(a.last_at,p."enrolledAt"))<=$9::timestamptz-interval '14 days') AS inactive14
  FROM progress p JOIN selected_courses c ON c.id=p."courseId"
  LEFT JOIN last_recorded a ON a.enrollment_id=p.id
), filtered AS (
  SELECT * FROM candidates WHERE $7::text='todos' OR stage=$7
    OR ($7='sin_actividad' AND inactive14) OR ($7='sin_cobertura' AND NOT "hasCoverage")
), active_students AS (
  SELECT estudiante_id,min("enrolledAt") AS enrolled_at FROM filtered
  WHERE "enrollmentStatus"='activa' AND "accountStatus"='aprobado' GROUP BY estudiante_id
), student_last AS (
  SELECT f.estudiante_id,max(a.at) AS last_at FROM filtered f JOIN recorded_activity a ON a.enrollment_id=f.id
  WHERE a.at<=$9::timestamptz GROUP BY f.estudiante_id
), latest_submissions AS (
  SELECT DISTINCT ON(e.tarea_id,e.inscripcion_id) e.id,e.curso_id,e.inscripcion_id,e.nota,e.calificado_por,e.calificado_en,e.entregado_en
  FROM lms.entregas_tarea e JOIN filtered f ON f.id=e.inscripcion_id
  ORDER BY e.tarea_id,e.inscripcion_id,e.numero DESC
), enabled_teachers AS (
  SELECT u.id,u.nombres||' '||u.apellidos AS name FROM lms.usuarios u
  WHERE u.estado='aprobado' AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id
    WHERE ur.usuario_id=u.id AND r.codigo='docente')
), selected_requests AS (
  SELECT s.id,s.estudiante_id,s.curso_id,s.estado,s.created_at,u.nombres||' '||u.apellidos AS student,c.titulo AS course
  FROM lms.solicitudes_inscripcion s JOIN selected_courses c ON c.id=s.curso_id JOIN lms.usuarios u ON u.id=s.estudiante_id
  WHERE ($13::text='todos' OR s.estado=$13)
    AND ($5::text='todos' AND $7::text='todos' OR EXISTS(SELECT 1 FROM filtered f WHERE f.estudiante_id=s.estudiante_id AND f."courseId"=s.curso_id))
), course_measures AS (
  SELECT c.id,c.titulo,c.estado,
    (SELECT count(*)::int FROM filtered f WHERE f."courseId"=c.id) AS enrollments,
    (SELECT count(*)::int FROM filtered f WHERE f."courseId"=c.id AND f."enrollmentStatus"='activa') AS active,
    (SELECT count(DISTINCT f.estudiante_id)::int FROM filtered f WHERE f."courseId"=c.id) AS students,
    (SELECT round(avg(f.percent)::numeric,1)::float8 FROM filtered f WHERE f."courseId"=c.id) AS progress,
    (SELECT count(*)::int FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id WHERE l.curso_id=c.id AND l.publicada AND m.publicado) AS lessons,
    (SELECT coalesce(sum(f."completedLessons"),0)::int FROM filtered f WHERE f."courseId"=c.id) AS completed,
    (SELECT count(*)::int FROM lms.tareas t WHERE t.curso_id=c.id AND t.publicada) AS tasks,
    (SELECT count(*)::int FROM latest_submissions e WHERE e.curso_id=c.id AND e.entregado_en>=$10::timestamptz AND e.entregado_en<$11::timestamptz) AS submissions,
    (SELECT count(*)::int FROM latest_submissions e WHERE e.curso_id=c.id AND e.nota IS NULL) AS pending,
    (SELECT count(*)::int FROM lms.curso_docentes d JOIN enabled_teachers t ON t.id=d.docente_id WHERE d.curso_id=c.id) AS teachers,
    coalesce((SELECT string_agg(t.name,', ' ORDER BY t.name) FROM lms.curso_docentes d JOIN enabled_teachers t ON t.id=d.docente_id WHERE d.curso_id=c.id),'Sin docente habilitado') AS teacher_names
  FROM selected_courses c
  WHERE ($5::text='todos' AND $7::text='todos') OR EXISTS(SELECT 1 FROM filtered f WHERE f."courseId"=c.id)
)`;

export const summarySelect = `SELECT jsonb_build_object(
  'users',(SELECT count(*)::int FROM lms.usuarios),
  'approvedUsers',(SELECT count(*)::int FROM lms.usuarios WHERE estado='aprobado'),
  'approvedStudents',(SELECT count(*)::int FROM lms.usuarios u WHERE u.estado='aprobado' AND EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='estudiante')),
  'approvedTeachers',(SELECT count(*)::int FROM enabled_teachers),
  'publishedCourses',(SELECT count(*)::int FROM course_measures WHERE estado='publicado'),
  'draftCourses',(SELECT count(*)::int FROM course_measures WHERE estado='borrador'),
  'reviewCourses',(SELECT count(*)::int FROM course_measures WHERE estado='revision'),
  'archivedCourses',(SELECT count(*)::int FROM course_measures WHERE estado='archivado'),
  'activeEnrollments',(SELECT count(*)::int FROM filtered WHERE "enrollmentStatus"='activa'),
  'enrolledStudents',(SELECT count(DISTINCT estudiante_id)::int FROM filtered),
  'pendingRequests',(SELECT count(*)::int FROM selected_requests WHERE estado='pendiente'),
  'averageProgress',(SELECT round(avg(percent)::numeric,1)::float8 FROM filtered WHERE "enrollmentStatus"='activa'),
  'progressDenominator',(SELECT count(percent)::int FROM filtered WHERE "enrollmentStatus"='activa'),
  'inactiveStudents',(SELECT count(*)::int FROM active_students s LEFT JOIN student_last a ON a.estudiante_id=s.estudiante_id WHERE greatest(s.enrolled_at,coalesce(a.last_at,s.enrolled_at))<=$9::timestamptz-interval '14 days'),
  'withoutCoverage',(SELECT count(*)::int FROM filtered WHERE "enrollmentStatus"='activa' AND NOT "hasCoverage"),
  'withCoverage',(SELECT count(*)::int FROM filtered WHERE "enrollmentStatus"='activa' AND "hasCoverage"),
  'pendingSubmissions',(SELECT count(*)::int FROM latest_submissions WHERE nota IS NULL),
  'gradedSubmissions',(SELECT count(*)::int FROM latest_submissions WHERE nota IS NOT NULL AND calificado_en>=$10::timestamptz AND calificado_en<$11::timestamptz),
  'unassignedCourses',(SELECT count(*)::int FROM course_measures WHERE estado='publicado' AND teachers=0),
  'activeParticipants',(SELECT count(DISTINCT a.id)::int FROM recorded_activity a JOIN filtered f ON f.id=a.enrollment_id WHERE a.at>=$10::timestamptz AND a.at<$11::timestamptz),
  'previousParticipants',(SELECT count(DISTINCT a.id)::int FROM recorded_activity a JOIN filtered f ON f.id=a.enrollment_id WHERE a.at>=$12::timestamptz AND a.at<$10::timestamptz)
) AS value`;

// Every record is an explicit public projection. Never serialize SQL entities.
export const rowSelects = {
  students: `SELECT f.id,f.student AS label,f."courseId" AS course_id,'[]'::jsonb AS courses,
    jsonb_build_object('course',f.course,'state',f."enrollmentStatus",'progress',f.percent,'lessons',f."totalLessons",'completed',f."completedLessons",'coverage',f."hasCoverage",'inactive',f.inactive14,'lastActivity',f.recorded_at,
      'submissions',(SELECT count(*)::int FROM latest_submissions e WHERE e.inscripcion_id=f.id AND e.entregado_en>=$10::timestamptz AND e.entregado_en<$11::timestamptz),
      'graded',(SELECT count(*)::int FROM latest_submissions e WHERE e.inscripcion_id=f.id AND e.nota IS NOT NULL AND e.calificado_en>=$10::timestamptz AND e.calificado_en<$11::timestamptz)) AS cells,
    f.percent AS progress,1 AS students,(SELECT count(*)::int FROM latest_submissions e WHERE e.inscripcion_id=f.id AND e.nota IS NULL) AS pending,extract(epoch FROM f.recorded_at)::float8 AS activity FROM filtered f`,
  courses: `SELECT c.id,c.titulo AS label,c.id AS course_id,'[]'::jsonb AS courses,
    jsonb_build_object('state',c.estado,'students',c.students,'enrollments',c.enrollments,'active',c.active,'progress',c.progress,'lessons',c.lessons,'completed',c.completed,'tasks',c.tasks,'submissions',c.submissions,'pending',c.pending,'teachers',c.teacher_names) AS cells,
    c.progress,c.students,c.pending,c.submissions::float8 AS activity FROM course_measures c`,
  teachers: `SELECT t.id,t.name AS label,NULL::uuid AS course_id,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'title',c.titulo) ORDER BY c.titulo,c.id) FROM lms.curso_docentes d JOIN course_measures c ON c.id=d.curso_id WHERE d.docente_id=t.id),'[]') AS courses,
    jsonb_build_object('state','aprobado','courses',(SELECT count(*)::int FROM lms.curso_docentes d JOIN course_measures c ON c.id=d.curso_id WHERE d.docente_id=t.id),
      'pending',(SELECT count(*)::int FROM latest_submissions e WHERE e.nota IS NULL AND EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=e.curso_id AND d.docente_id=t.id)),
      'graded',(SELECT count(*)::int FROM latest_submissions e WHERE e.calificado_por=t.id AND e.nota IS NOT NULL AND e.calificado_en>=$10::timestamptz AND e.calificado_en<$11::timestamptz),
      'activity',(SELECT count(*)::int FROM lms.retroalimentaciones r JOIN latest_submissions e ON e.id=r.entrega_id WHERE r.docente_id=t.id AND r.created_at>=$10::timestamptz AND r.created_at<$11::timestamptz),
      'sessions',(SELECT count(*)::int FROM lms.sesiones_clase sc JOIN course_measures c ON c.id=sc.curso_id WHERE sc.docente_id=t.id AND sc.estado IN ('en_curso','finalizada') AND sc.inicia_en>=$10::timestamptz AND sc.inicia_en<$11::timestamptz)) AS cells,
    NULL::int AS progress,0 AS students,
    (SELECT count(*)::int FROM latest_submissions e WHERE e.nota IS NULL AND EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=e.curso_id AND d.docente_id=t.id)) AS pending,
    (SELECT count(*)::float8 FROM latest_submissions e WHERE e.calificado_por=t.id AND e.calificado_en>=$10::timestamptz AND e.calificado_en<$11::timestamptz) AS activity
    FROM enabled_teachers t WHERE ($3::uuid IS NULL AND $5::text='todos' AND $7::text='todos' AND $8::text='todos') OR EXISTS(SELECT 1 FROM lms.curso_docentes d JOIN course_measures c ON c.id=d.curso_id WHERE d.docente_id=t.id)`,
  requests: `SELECT s.id,s.student AS label,s.curso_id AS course_id,'[]'::jsonb AS courses,
    jsonb_build_object('course',s.course,'state',s.estado,'requestedAt',s.created_at) AS cells,
    NULL::int AS progress,1 AS students,CASE WHEN s.estado='pendiente' THEN 1 ELSE 0 END AS pending,extract(epoch FROM s.created_at)::float8 AS activity
    FROM selected_requests s WHERE s.created_at>=$10::timestamptz AND s.created_at<$11::timestamptz`,
  traffic: `SELECT to_char(d,'YYYY-MM-DD') AS id,to_char(d,'YYYY-MM-DD') AS label,NULL::uuid AS course_id,'[]'::jsonb AS courses,
    jsonb_build_object('visitors',CASE WHEN d<(SELECT (enabled_at AT TIME ZONE 'UTC')::date FROM lms.web_analytics_config WHERE singleton) THEN NULL ELSE
      (SELECT count(DISTINCT v.visitor_hash)::int FROM lms.web_visits_daily v WHERE v.day=d::date AND ($3::uuid IS NULL OR v.course_id=$3)) END,
      'requests',(SELECT count(*)::int FROM selected_requests s WHERE (s.created_at AT TIME ZONE 'UTC')::date=d::date)) AS cells,
    NULL::int AS progress,0 AS students,0 AS pending,extract(epoch FROM d)::float8 AS activity
    FROM generate_series($10::timestamptz AT TIME ZONE 'UTC',($11::timestamptz AT TIME ZONE 'UTC')-interval '1 day',interval '1 day') AS series(d)`,
} as const;
