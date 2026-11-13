import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { SessionUser } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { TeachingService } from './teaching.service';
import { TeachingQuery } from './teaching.dto';
import { CreateEvaluationDto, SubmitEvaluationDto } from './evaluation.dto';

const supported = `(SELECT count(*) FROM lms.evaluacion_preguntas ep WHERE ep.evaluacion_id=e.id) BETWEEN 1 AND 30
 AND NOT EXISTS(SELECT 1 FROM lms.evaluacion_preguntas ep JOIN lms.preguntas p ON p.id=ep.pregunta_id
 WHERE ep.evaluacion_id=e.id AND p.tipo<>'unica')`;

@Injectable()
export class EvaluationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly teaching: TeachingService,
  ) {}
  async list(user: SessionUser, courseId: string, q: TeachingQuery) {
    await this.teaching.course(user, courseId, q.role);
    const r = await this.db.query(
      `SELECT e.id,e.titulo AS title,m.titulo AS module,e.duracion_minutos AS minutes,
      e.intentos_maximos AS attempts,e.nota_minima::float AS "passingScore",
      (SELECT count(*)::int FROM lms.intentos_evaluacion t JOIN lms.inscripciones i ON i.id=t.inscripcion_id
        WHERE t.evaluacion_id=e.id AND ($2<>'estudiante' OR i.estudiante_id=$1)) AS "usedAttempts",
      (SELECT max(t.nota)::float FROM lms.intentos_evaluacion t JOIN lms.inscripciones i ON i.id=t.inscripcion_id
        WHERE t.evaluacion_id=e.id AND ($2<>'estudiante' OR i.estudiante_id=$1)) AS "bestScore"
      FROM lms.evaluaciones e JOIN lms.modulos m ON m.id=e.modulo_id
      WHERE e.curso_id=$3 AND e.publicada AND ${supported} AND ($4::uuid IS NULL OR e.id>$4)
        AND ($2<>'estudiante' OR lms.puede_acceder_modulo($1,m.id))
      ORDER BY e.id LIMIT $5`,
      [user.id, q.role, courseId, q.cursor ?? null, q.limit + 1],
    );
    return {
      items: r.rows.slice(0, q.limit),
      nextCursor: r.rows.length > q.limit ? r.rows[q.limit - 1].id : null,
    };
  }
  async results(
    user: SessionUser,
    courseId: string,
    evaluationId: string,
    q: TeachingQuery,
  ) {
    if (q.role === 'estudiante')
      throw new ForbiddenException(
        'Los resultados del grupo requieren un perfil docente o administrativo.',
      );
    await this.teaching.course(user, courseId, q.role);
    const r = await this.db.query(
      `SELECT t.id,u.nombres||' '||u.apellidos AS student,t.numero AS number,
      t.estado AS status,t.nota::float AS score,t.entregado_en AS "submittedAt"
      FROM lms.intentos_evaluacion t JOIN lms.inscripciones i ON i.id=t.inscripcion_id
      JOIN lms.usuarios u ON u.id=i.estudiante_id
      WHERE t.curso_id=$1 AND t.evaluacion_id=$2 AND ($3::uuid IS NULL OR t.id>$3)
      ORDER BY t.id LIMIT $4`,
      [courseId, evaluationId, q.cursor ?? null, q.limit + 1],
    );
    return {
      items: r.rows.slice(0, q.limit),
      nextCursor: r.rows.length > q.limit ? r.rows[q.limit - 1].id : null,
    };
  }
  async create(user: SessionUser, courseId: string, dto: CreateEvaluationDto) {
    this.identity.authorize(user, 'docente', 'teaching.manage');
    if (dto.questions.some((q) => q.correctIndex >= q.options.length))
      throw new ConflictException(
        'Cada pregunta necesita una respuesta correcta válida.',
      );
    return this.db.transaction(async (c) => {
      const scope = await c.query(
        `SELECT m.id FROM lms.modulos m JOIN lms.cursos curso ON curso.id=m.curso_id
        JOIN lms.curso_docentes d ON d.curso_id=curso.id
        WHERE curso.id=$1 AND d.docente_id=$2 AND curso.estado<>'archivado' AND m.id=$3 AND m.publicado FOR SHARE OF curso,d,m`,
        [courseId, user.id, dto.moduleId],
      );
      if (!scope.rowCount)
        throw new NotFoundException(
          'Selecciona un módulo publicado de una materia asignada.',
        );
      await c.query("SELECT set_config('app.actor_id',$1,true)", [user.id]);
      const e = await c.query(
        `INSERT INTO lms.evaluaciones(curso_id,modulo_id,titulo,tipo,publicada,nota_minima,intentos_maximos,duracion_minutos)
        VALUES($1,$2,$3,'modulo',true,$4,$5,$6) RETURNING id`,
        [
          courseId,
          dto.moduleId,
          dto.title,
          dto.passingScore,
          dto.attempts,
          dto.minutes,
        ],
      );
      for (const [index, q] of dto.questions.entries()) {
        const question = await c.query(
          "INSERT INTO lms.preguntas(curso_id,tipo,enunciado) VALUES($1,'unica',$2) RETURNING id",
          [courseId, q.text],
        );
        await c.query(
          `INSERT INTO lms.opciones_pregunta(pregunta_id,texto,es_correcta,orden)
          SELECT $1,text,ordinality-1=$3,ordinality FROM unnest($2::text[]) WITH ORDINALITY AS options(text,ordinality)`,
          [question.rows[0].id, q.options, q.correctIndex],
        );
        await c.query(
          `INSERT INTO lms.evaluacion_preguntas(evaluacion_id,curso_id,pregunta_id,puntaje,orden)
          VALUES($1,$2,$3,1,$4)`,
          [e.rows[0].id, courseId, question.rows[0].id, index + 1],
        );
      }
      return {
        message:
          'Evaluación publicada. Su contenido se conserva para proteger los intentos.',
        id: e.rows[0].id,
      };
    });
  }
  private async enrollment(
    c: PoolClient,
    user: SessionUser,
    courseId: string,
    evaluationId: string,
  ) {
    this.identity.authorize(user, 'estudiante', 'classroom.study');
    const r = await c.query(
      `SELECT i.id,e.intentos_maximos AS attempts FROM lms.inscripciones i
      JOIN lms.cursos curso ON curso.id=i.curso_id JOIN lms.evaluaciones e ON e.curso_id=i.curso_id
      WHERE i.estudiante_id=$1 AND i.curso_id=$2 AND i.estado='activa' AND curso.estado='publicado'
      AND e.id=$3 AND e.publicada AND e.tipo='modulo' AND ${supported}
      AND lms.puede_acceder_modulo($1,e.modulo_id) FOR UPDATE OF i`,
      [user.id, courseId, evaluationId],
    );
    if (!r.rowCount)
      throw new NotFoundException(
        'La evaluación no está disponible para tu matrícula y acceso.',
      );
    return r.rows[0];
  }
  async start(user: SessionUser, courseId: string, evaluationId: string) {
    return this.db.transaction(async (c) => {
      const enrollment = await this.enrollment(c, user, courseId, evaluationId);
      await c.query(
        `UPDATE lms.intentos_evaluacion SET estado='anulado'
        WHERE inscripcion_id=$1 AND evaluacion_id=$2 AND estado='en_curso' AND vence_en<=now()`,
        [enrollment.id, evaluationId],
      );
      let attempt = (
        await c.query(
          `SELECT id,vence_en AS "expiresAt" FROM lms.intentos_evaluacion
        WHERE inscripcion_id=$1 AND evaluacion_id=$2 AND estado='en_curso'`,
          [enrollment.id, evaluationId],
        )
      ).rows[0];
      if (!attempt) {
        const count = await c.query(
          'SELECT count(*)::int AS n FROM lms.intentos_evaluacion WHERE inscripcion_id=$1 AND evaluacion_id=$2',
          [enrollment.id, evaluationId],
        );
        if (count.rows[0].n >= enrollment.attempts)
          throw new ConflictException('Has alcanzado el límite de intentos.');
        const created = await c.query(
          'SELECT lms.iniciar_intento($1,$2) AS id',
          [enrollment.id, evaluationId],
        );
        attempt = (
          await c.query(
            'SELECT id,vence_en AS "expiresAt" FROM lms.intentos_evaluacion WHERE id=$1',
            [created.rows[0].id],
          )
        ).rows[0];
      }
      // Deliberate projection: never serialize answer keys or explanations to students.
      const questions = await c.query(
        `SELECT p.id,p.enunciado AS text,
        (SELECT jsonb_agg(jsonb_build_object('id',o.id,'text',o.texto) ORDER BY o.orden)
          FROM lms.opciones_pregunta o WHERE o.pregunta_id=p.id) AS options
        FROM lms.evaluacion_preguntas ep JOIN lms.preguntas p ON p.id=ep.pregunta_id
        WHERE ep.evaluacion_id=$1 ORDER BY ep.orden`,
        [evaluationId],
      );
      return {
        ...attempt,
        questions: questions.rows,
        message: 'Intento iniciado o recuperado.',
      };
    });
  }
  async submit(
    user: SessionUser,
    courseId: string,
    evaluationId: string,
    attemptId: string,
    dto: SubmitEvaluationDto,
  ) {
    try {
      return await this.db.transaction(async (c) => {
        const enrollment = await this.enrollment(
          c,
          user,
          courseId,
          evaluationId,
        );
        const r = await c.query(
          `SELECT id,estado,nota::float AS score,vence_en FROM lms.intentos_evaluacion
          WHERE id=$1 AND evaluacion_id=$2 AND inscripcion_id=$3 FOR UPDATE`,
          [attemptId, evaluationId, enrollment.id],
        );
        if (!r.rowCount) throw new NotFoundException('Intento no disponible.');
        if (r.rows[0].estado === 'calificado')
          return {
            message: 'La evaluación ya fue calificada.',
            score: r.rows[0].score,
          };
        if (
          r.rows[0].estado !== 'en_curso' ||
          new Date(r.rows[0].vence_en).getTime() <= Date.now()
        )
          throw new ConflictException('El intento está cerrado o venció.');
        await c.query('SELECT lms.entregar_intento($1,$2::jsonb)', [
          attemptId,
          JSON.stringify(
            dto.answers.map((a) => ({
              pregunta_id: a.questionId,
              opciones: [a.optionId],
            })),
          ),
        ]);
        const result = await c.query(
          'SELECT nota::float AS score FROM lms.intentos_evaluacion WHERE id=$1',
          [attemptId],
        );
        return {
          message: 'Evaluación entregada y calificada.',
          score: result.rows[0].score,
        };
      });
    } catch (error) {
      if (
        ['P0001', 'P0002', '23503', '23505'].includes(
          (error as { code?: string }).code ?? '',
        )
      )
        throw new ConflictException(
          'Revisa las respuestas, la vigencia del intento y tu acceso al módulo.',
        );
      throw error;
    }
  }
}
