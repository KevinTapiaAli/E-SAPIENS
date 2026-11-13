import { randomBytes, randomUUID } from 'node:crypto';
import { Client, type PoolClient } from 'pg';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@esapiens/contracts';
import { DatabaseService } from '../src/infrastructure/database/database.service';
import { IdentityService } from '../src/modules/identity/identity.service';
import { TeachingService } from '../src/modules/academic/teaching.service';
import { CommerceService } from '../src/modules/academic/commerce.service';
import { EvaluationService } from '../src/modules/academic/evaluation.service';

describe('LMS contra PostgreSQL: transacción aislada, sin HTTP ni cobros', () => {
  let client: Client;
  let commerce: CommerceService;
  let evaluation: EvaluationService;
  const course = randomUUID(),
    moduleId = randomUUID(),
    category = randomUUID();
  const session = (role: string, permissions: string[]) =>
    ({ id: randomUUID(), roles: [role], permissions }) as SessionUser;
  const admin = session('administrador', ['commerce.manage', 'academic.read']);
  const teacher = session('docente', ['teaching.manage']);
  const student = session('estudiante', ['classroom.study']);
  const outsider = session('estudiante', ['classroom.study']);
  const marker = 'lms-test-' + randomUUID();
  beforeAll(async () => {
    await ConfigModule.forRoot({ envFilePath: ['../../.env', '.env'] });
    const url = new URL(process.env.DATABASE_URL ?? 'invalid:');
    if (
      process.env.NODE_ENV === 'production' ||
      !['local', 'test'].includes(process.env.APP_ENV ?? '') ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['/esapiens', '/esapiens_test'].includes(url.pathname)
    )
      throw new Error(
        'Esta prueba solo admite esapiens/esapiens_test en un entorno local/test.',
      );
    client = new Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
      lock_timeout: 1000,
    });
    await client.connect();
    await client.query('BEGIN');
    const db = {
      query: (sql: string, params: unknown[] = []) => client.query(sql, params),
      transaction: async <T>(work: (c: PoolClient) => Promise<T>) => {
        await client.query('SAVEPOINT lms_operation');
        try {
          const result = await work(client as unknown as PoolClient);
          await client.query('RELEASE SAVEPOINT lms_operation');
          return result;
        } catch (error) {
          await client.query('ROLLBACK TO SAVEPOINT lms_operation');
          await client.query('RELEASE SAVEPOINT lms_operation');
          throw error;
        }
      },
    } as unknown as DatabaseService;
    const identity = new IdentityService(db);
    const teaching = new TeachingService(db, identity);
    commerce = new CommerceService(
      db,
      identity,
      new ConfigService({
        PAYMENT_INSTRUCTIONS: 'Solo prueba aislada; no realizar pagos.',
      }),
    );
    evaluation = new EvaluationService(db, identity, teaching);
    for (const [index, user] of [admin, teacher, student, outsider].entries()) {
      await client.query(
        `INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado,aprobado_en)
        VALUES($1,$2,$3,'Prueba','LMS',$4,'aprobado',now())`,
        [
          user.id,
          `${marker}-${index}@example.test`,
          `${marker}-${index}`,
          randomBytes(48).toString('hex'),
        ],
      );
      await client.query(
        'INSERT INTO lms.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM lms.roles WHERE codigo=$2',
        [user.id, user.roles[0]],
      );
    }
    await client.query(
      'INSERT INTO lms.categorias_curso(id,nombre,slug) VALUES($1,$2,$2)',
      [category, marker],
    );
    await client.query(
      `INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,estado,creado_por,aprobado_por,aprobado_en)
      VALUES($1,$2,$3,$3,'Prueba aislada','Validar transacciones','Inicial',10,'publicado',$4,$4,now())`,
      [course, category, marker, admin.id],
    );
    await client.query(
      "INSERT INTO lms.modulos(id,curso_id,titulo,descripcion,orden,publicado) VALUES($1,$2,'Módulo de prueba','Prueba',1,true)",
      [moduleId, course],
    );
    await client.query(
      "INSERT INTO lms.perfiles_docentes(usuario_id,especialidad) VALUES($1,'Prueba LMS')",
      [teacher.id],
    );
    await client.query(
      'INSERT INTO lms.curso_docentes(curso_id,docente_id) VALUES($1,$2)',
      [course, teacher.id],
    );
  });
  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
      await client.end();
    }
  });
  it('compra pendiente → revisión → acceso → examen → nota, con propiedad e idempotencia', async () => {
    const plan = await commerce.createPlan(admin, {
      courseId: course,
      name: 'Plan de prueba aislado',
      price: '100.00',
      currency: 'BOB',
      days: 30,
    });
    expect((await commerce.plans(student, { limit: 24 })).items).toBeInstanceOf(
      Array,
    );
    const orderId = randomUUID();
    await commerce.order(student, { planId: plan.id, operationId: orderId });
    await commerce.order(student, { planId: plan.id, operationId: orderId });
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS n FROM lms.ordenes WHERE id=$1',
          [orderId],
        )
      ).rows[0].n,
    ).toBe(1);
    await expect(
      commerce.report(outsider, orderId, { method: 'qr', reference: marker }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await commerce.report(student, orderId, {
      method: 'transferencia',
      reference: marker,
    });
    expect(
      (
        await client.query(
          'SELECT lms.puede_acceder_modulo($1,$2) AS allowed',
          [student.id, moduleId],
        )
      ).rows[0].allowed,
    ).toBe(false);
    const payment = (
      await client.query('SELECT id FROM lms.pagos WHERE orden_id=$1', [
        orderId,
      ])
    ).rows[0].id;
    await commerce.review(admin, payment, {
      decision: 'confirmar',
      reason: 'Validación transaccional aislada; no es un ingreso real.',
    });
    await commerce.review(admin, payment, {
      decision: 'confirmar',
      reason: 'Repetición idempotente de prueba.',
    });
    expect(
      (
        await client.query(
          'SELECT lms.puede_acceder_modulo($1,$2) AS allowed',
          [student.id, moduleId],
        )
      ).rows[0].allowed,
    ).toBe(true);
    const count = await client.query(
      'SELECT count(*)::int AS n FROM lms.accesos_modulo a JOIN lms.inscripciones i ON i.id=a.inscripcion_id WHERE i.estudiante_id=$1 AND a.modulo_id=$2',
      [student.id, moduleId],
    );
    expect(count.rows[0].n).toBe(1);
    expect((await commerce.orders(student, { limit: 24 })).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: orderId,
          total: '100.00',
          status: 'pagada',
        }),
      ]),
    );
    const exam = await evaluation.create(teacher, course, {
      moduleId,
      title: 'Evaluación de prueba',
      minutes: 30,
      attempts: 2,
      passingScore: 60,
      questions: [
        {
          text: '¿Qué protocolo cifra HTTP?',
          options: ['HTTP', 'HTTPS'],
          correctIndex: 1,
        },
      ],
    });
    await expect(
      evaluation.start(outsider, course, exam.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    const attempt = await evaluation.start(student, course, exam.id);
    expect((await evaluation.start(student, course, exam.id)).id).toBe(
      attempt.id,
    );
    expect(JSON.stringify(attempt)).not.toMatch(/es_correcta|correctIndex/);
    const question = attempt.questions[0];
    const result = await evaluation.submit(
      student,
      course,
      exam.id,
      attempt.id,
      {
        answers: [
          { questionId: question.id, optionId: question.options[1].id },
        ],
      },
    );
    expect(result.score).toBe(100);
    expect(
      (
        await evaluation.submit(student, course, exam.id, attempt.id, {
          answers: [],
        })
      ).score,
    ).toBe(100);
    await expect(
      evaluation.results(student, course, exam.id, {
        role: 'estudiante',
        limit: 12,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      (
        await evaluation.results(teacher, course, exam.id, {
          role: 'docente',
          limit: 12,
        })
      ).items,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ score: 100 })]),
    );
    expect(
      (
        await evaluation.list(student, course, {
          role: 'estudiante',
          limit: 12,
        })
      ).items,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: exam.id, bestScore: 100 }),
      ]),
    );
  });
});
