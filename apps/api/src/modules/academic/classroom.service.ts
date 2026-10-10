import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ClassroomCourse,
  ClassroomLesson,
  ClassroomLessonSummary,
  ClassroomModule,
  SessionUser,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';

@Injectable()
export class ClassroomService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
  ) {}

  async course(user: SessionUser, courseId: string): Promise<ClassroomCourse> {
    this.identity.authorize(user, 'estudiante', 'classroom.study');
    const result = await this.db.query<{
      id: string;
      title: string;
      enrollmentId: string;
      enrollmentStatus: string;
      requiresExam: boolean;
    }>(
      `SELECT c.id,c.titulo AS title,i.id AS "enrollmentId",i.estado AS "enrollmentStatus",coalesce(r.presentar_examen,true) AS "requiresExam"
       FROM lms.inscripciones i JOIN lms.cursos c ON c.id=i.curso_id LEFT JOIN lms.reglas_curso r ON r.curso_id=c.id
       WHERE i.estudiante_id=$1 AND c.id=$2`,
      [user.id, courseId],
    );
    const course = result.rows[0];
    if (!course)
      throw new NotFoundException({
        code: 'ENROLLMENT_NOT_FOUND',
        message: 'No tienes una matrícula en esta materia.',
      });
    const modules = await this.db.query<Omit<ClassroomModule, 'lessons'>>(
      `SELECT m.id,m.titulo AS title,m.descripcion AS description,lms.puede_acceder_modulo($1,m.id) AS available,
       (SELECT max(a.hasta) FROM lms.accesos_modulo a WHERE a.inscripcion_id=i.id AND a.modulo_id=m.id AND a.revocado_en IS NULL AND now()>=a.desde AND now()<a.hasta) AS "accessUntil",
       CASE
       WHEN i.estado<>'activa' THEN 'Tu matrícula está inactiva. Contacta con administración.'
       WHEN c.estado<>'publicado' THEN 'Esta materia no está publicada actualmente.'
       WHEN lms.puede_acceder_modulo($1,m.id) THEN 'Disponible para estudiar.'
       WHEN NOT EXISTS(SELECT 1 FROM lms.accesos_modulo a WHERE a.inscripcion_id=i.id AND a.modulo_id=m.id AND a.revocado_en IS NULL AND now()>=a.desde AND now()<a.hasta)
       THEN CASE WHEN EXISTS(SELECT 1 FROM lms.accesos_modulo a WHERE a.inscripcion_id=i.id AND a.modulo_id=m.id AND a.revocado_en IS NULL AND a.desde>now())
         THEN 'El período de acceso todavía no ha comenzado.'
         WHEN EXISTS(SELECT 1 FROM lms.accesos_modulo a WHERE a.inscripcion_id=i.id AND a.modulo_id=m.id AND a.revocado_en IS NULL AND a.hasta<=now())
         THEN 'El acceso venció. Solicita su renovación a administración.'
         ELSE 'Sin autorización vigente para este módulo. Contacta con administración.' END
       WHEN EXISTS(SELECT 1 FROM lms.prerrequisitos_curso pr WHERE pr.curso_id=c.id AND NOT EXISTS(
         SELECT 1 FROM lms.inscripciones ip WHERE ip.estudiante_id=$1 AND ip.curso_id=pr.requerido_id AND lms.curso_completado(ip.id)))
         THEN 'Completa las materias previas requeridas para este curso.'
       ELSE 'Completa los módulos anteriores y sus requisitos académicos para continuar.' END AS "accessReason"
       FROM lms.modulos m JOIN lms.cursos c ON c.id=m.curso_id JOIN lms.inscripciones i ON i.curso_id=c.id
       WHERE i.id=$2 AND m.publicado ORDER BY m.orden`,
      [user.id, course.enrollmentId],
    );
    const lessons = await this.db.query<
      ClassroomLessonSummary & { moduleId: string }
    >(
      `SELECT l.id,l.modulo_id AS "moduleId",l.titulo AS title,l.tipo AS type,l.duracion_minutos AS "durationMinutes",p.completado_en IS NOT NULL AS completed
       FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id
       LEFT JOIN lms.progreso_lecciones p ON p.leccion_id=l.id AND p.inscripcion_id=$1
       WHERE l.curso_id=$2 AND l.publicada AND m.publicado ORDER BY m.orden,l.orden`,
      [course.enrollmentId, courseId],
    );
    return {
      id: course.id,
      title: course.title,
      enrollmentStatus: course.enrollmentStatus,
      requiresExam: course.requiresExam,
      modules: modules.rows.map((module) => ({
        ...module,
        lessons: lessons.rows
          .filter((lesson) => lesson.moduleId === module.id)
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            durationMinutes: lesson.durationMinutes,
            completed: lesson.completed,
          })),
      })),
    };
  }

  async lesson(
    user: SessionUser,
    courseId: string,
    lessonId: string,
  ): Promise<ClassroomLesson> {
    this.identity.authorize(user, 'estudiante', 'classroom.study');
    // La autorización se evalúa en la misma consulta que selecciona el contenido.
    const result = await this.db.query<ClassroomLesson>(
      `SELECT l.id,l.titulo AS title,l.tipo AS type,l.duracion_minutos AS "durationMinutes",l.contenido AS content,
       l.curso_id AS "courseId",c.titulo AS "courseTitle",m.titulo AS "moduleTitle",p.completado_en IS NOT NULL AS completed,
       (l.tipo IN ('lectura','actividad','enlace') AND length(btrim(coalesce(l.contenido,'')))>0) AS "canComplete"
       FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id JOIN lms.cursos c ON c.id=l.curso_id
       JOIN lms.inscripciones i ON i.curso_id=c.id AND i.estudiante_id=$1
       LEFT JOIN lms.progreso_lecciones p ON p.inscripcion_id=i.id AND p.leccion_id=l.id
       WHERE l.id=$3 AND l.curso_id=$2 AND l.publicada AND lms.puede_acceder_modulo($1,m.id)`,
      [user.id, courseId, lessonId],
    );
    if (!result.rows[0])
      throw new ForbiddenException({
        code: 'LESSON_ACCESS_DENIED',
        message:
          'No tienes acceso vigente a esta lección. Revisa la matrícula y los requisitos del módulo.',
      });
    return result.rows[0];
  }

  async complete(user: SessionUser, courseId: string, lessonId: string) {
    this.identity.authorize(user, 'estudiante', 'classroom.study');
    return this.db.transaction(async (client) => {
      // Mismo orden que el editor: curso antes que matrícula y lección.
      await client.query('SELECT id FROM lms.cursos WHERE id=$1 FOR SHARE', [
        courseId,
      ]);
      const enrollment = await client.query<{ id: string }>(
        'SELECT id FROM lms.inscripciones WHERE estudiante_id=$1 AND curso_id=$2 FOR UPDATE',
        [user.id, courseId],
      );
      if (!enrollment.rows[0])
        throw new ForbiddenException({
          code: 'LESSON_ACCESS_DENIED',
          message: 'No tienes matrícula en esta materia.',
        });
      const lesson = await client.query<{
        allowed: boolean;
        completable: boolean;
      }>(
        `SELECT lms.puede_acceder_modulo($1,m.id) AS allowed,
         (l.tipo IN ('lectura','actividad','enlace') AND length(btrim(coalesce(l.contenido,'')))>0) AS completable
         FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id JOIN lms.cursos c ON c.id=l.curso_id
         WHERE l.id=$3 AND l.curso_id=$2 AND l.publicada FOR SHARE OF l,m,c`,
        [user.id, courseId, lessonId],
      );
      if (!lesson.rows[0]?.allowed)
        throw new ForbiddenException({
          code: 'LESSON_ACCESS_DENIED',
          message: 'El acceso a esta lección no está habilitado.',
        });
      if (!lesson.rows[0].completable)
        throw new ConflictException({
          code: 'LESSON_CONTENT_UNAVAILABLE',
          message:
            'Esta lección todavía no tiene contenido disponible para completar en el aula.',
        });
      const previous = await client.query(
        'SELECT id FROM lms.progreso_lecciones WHERE inscripcion_id=$1 AND leccion_id=$2 AND completado_en IS NOT NULL',
        [enrollment.rows[0].id, lessonId],
      );
      // No aceptar del navegador tiempos vistos ni notas. El avance es declarado por el alumno.
      await client.query('SELECT lms.registrar_progreso($1,$2,0,true)', [
        enrollment.rows[0].id,
        lessonId,
      ]);
      if (!previous.rowCount)
        await client.query(
          "INSERT INTO lms.historial_acceso(usuario_id,leccion_id,evento) VALUES($1,$2,'completar')",
          [user.id, lessonId],
        );
      return { message: 'Lección completada. Tu avance ya está registrado.' };
    });
  }
}
