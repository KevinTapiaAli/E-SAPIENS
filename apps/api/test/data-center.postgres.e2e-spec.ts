import { randomBytes, randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { RuntimeModule } from '../src/common/runtime.module';
import { DatabaseService } from '../src/infrastructure/database/database.service';
import { DataCenterService } from '../src/modules/analytics/data-center.service';
import { DataCenterQuery } from '../src/modules/analytics/data-center.dto';

describe('Centro de Datos: PostgreSQL fixtures isolated by ROLLBACK', () => {
  let module: TestingModule;
  let db: Client;
  let service: DataCenterService;
  const ids = Array.from({ length: 16 }, () => randomUUID());
  const [
    admin,
    s1,
    s2,
    teacher,
    category,
    course,
    emptyCourse,
    mod,
    hiddenMod,
    enrollment1,
    enrollment2,
    emptyEnrollment,
    task1,
    task2,
    lesson1,
  ] = ids;
  const marker = `data-center-${randomUUID()}`;
  const query = (values: Partial<DataCenterQuery> = {}) =>
    Object.assign(
      new DataCenterQuery(),
      { courseId: course, days: '7' },
      values,
    );
  beforeAll(async () => {
    // A single client intentionally serializes queries inside the uncommitted transaction.
    let pending: Promise<unknown> = Promise.resolve();
    module = await Test.createTestingModule({
      imports: [RuntimeModule],
      providers: [
        DataCenterService,
        {
          provide: DatabaseService,
          useValue: {
            query: (sql: string, params: unknown[]) => {
              const result = pending.then(() => db.query(sql, params));
              pending = result.catch(() => undefined);
              return result;
            },
          },
        },
      ],
    }).compile();
    const config = module.get(ConfigService);
    const url = new URL(config.getOrThrow<string>('DATABASE_URL'));
    if (
      config.get('NODE_ENV') === 'production' ||
      !['local', 'test'].includes(config.get<string>('APP_ENV') ?? '') ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['/esapiens', '/esapiens_test'].includes(url.pathname)
    )
      throw new Error('Data center E2E requires a local/test database');
    db = new Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 10000,
      statement_timeout: 5000,
    });
    await db.connect();
    await db.query('BEGIN');
    service = module.get(DataCenterService);
    for (const [index, id] of [admin, s1, s2, teacher].entries()) {
      await db.query(
        "INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado,aprobado_en) VALUES($1::uuid,$2,$1::text,$3,'Prueba',$4,'aprobado',now())",
        [
          id,
          `${marker}-${index}@example.test`,
          index === 1 ? '=2+3' : `Persona ${index}`,
          randomBytes(40).toString('hex'),
        ],
      );
      await db.query(
        'INSERT INTO lms.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM lms.roles WHERE codigo=$2',
        [
          id,
          index === 0
            ? 'administrador'
            : index === 3
              ? 'docente'
              : 'estudiante',
        ],
      );
    }
    await db.query(
      "INSERT INTO lms.perfiles_docentes(usuario_id,especialidad) VALUES($1,'Pruebas')",
      [teacher],
    );
    await db.query(
      'INSERT INTO lms.categorias_curso(id,nombre,slug) VALUES($1,$2,$2)',
      [category, marker],
    );
    for (const [index, id] of [course, emptyCourse].entries())
      await db.query(
        "INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,estado,creado_por,aprobado_por,aprobado_en) VALUES($1,$2,$3,$4,'Prueba','Prueba','Inicial',1,'publicado',$5,$5,now())",
        [id, category, `Materia, "${index}"`, `${marker}-${index}`, admin],
      );
    await db.query(
      'INSERT INTO lms.curso_docentes(curso_id,docente_id) VALUES($1,$2)',
      [course, teacher],
    );
    await db.query(
      "INSERT INTO lms.modulos(id,curso_id,titulo,descripcion,orden,publicado) VALUES($1,$3,'Publicado','Prueba',1,true),($2,$3,'Oculto','Prueba',2,false)",
      [mod, hiddenMod, course],
    );
    for (let i = 0; i < 4; i++)
      await db.query(
        "INSERT INTO lms.lecciones(id,curso_id,modulo_id,titulo,tipo,contenido,orden,duracion_minutos,publicada) VALUES($1,$2,$3,'Prueba','lectura','Contenido privado', $4,10,$5)",
        [i === 0 ? lesson1 : randomUUID(), course, mod, i + 1, i < 3],
      );
    await db.query(
      "INSERT INTO lms.lecciones(curso_id,modulo_id,titulo,tipo,contenido,orden,duracion_minutos,publicada) VALUES($1,$2,'Oculta','lectura','Contenido privado',1,10,true)",
      [course, hiddenMod],
    );
    for (const [id, student, subject] of [
      [enrollment1, s1, course],
      [enrollment2, s2, course],
      [emptyEnrollment, s1, emptyCourse],
    ])
      await db.query(
        "INSERT INTO lms.inscripciones(id,estudiante_id,curso_id,inscrito_en) VALUES($1,$2,$3,now()-interval '25 days')",
        [id, student, subject],
      );
    await db.query(
      "INSERT INTO lms.progreso_lecciones(inscripcion_id,curso_id,leccion_id,iniciado_en,completado_en) VALUES($1,$2,$3,now()-interval '22 days',now()-interval '21 days')",
      [enrollment1, course, lesson1],
    );
    for (const [enrollment, from, to, revoked] of [
      [enrollment1, -2, 2, false],
      [enrollment1, -1, 3, false],
      [enrollment2, -10, -1, false],
      [enrollment2, 1, 3, false],
      [enrollment2, -2, 2, true],
    ] as const)
      await db.query(
        "INSERT INTO lms.accesos_modulo(inscripcion_id,curso_id,modulo_id,autorizado_por,motivo,desde,hasta,revocado_en) VALUES($1,$2,$3,$4,'Prueba',now()+$5*interval '1 day',now()+$6*interval '1 day',CASE WHEN $7 THEN now() END)",
        [enrollment, course, mod, admin, from, to, revoked],
      );
    for (const id of [task1, task2])
      await db.query(
        "INSERT INTO lms.tareas(id,curso_id,modulo_id,titulo,instrucciones,fecha_limite) VALUES($1,$2,$3,'Prueba','Prueba',now()+interval '1 day')",
        [id, course, mod],
      );
    // Old graded attempt superseded by an ungraded attempt: one pending item, not two.
    await db.query(
      "INSERT INTO lms.entregas_tarea(tarea_id,curso_id,inscripcion_id,numero,entregado_en,nota,calificado_por,calificado_en) VALUES($1,$2,$3,1,now()-interval '23 days',80,$4,now()-interval '22 days'),($1,$2,$3,2,now()-interval '20 days',NULL,NULL,NULL)",
      [task1, course, enrollment1, teacher],
    );
    await db.query(
      "INSERT INTO lms.entregas_tarea(tarea_id,curso_id,inscripcion_id,numero,entregado_en,nota,calificado_por,calificado_en) VALUES($1,$2,$3,1,now()-interval '2 days',60,$4,now()-interval '1 day')",
      [task2, course, enrollment2, teacher],
    );
    await db.query(
      "INSERT INTO lms.solicitudes_inscripcion(estudiante_id,curso_id,created_at) VALUES($1,$2,now()-interval '2 days')",
      [s1, course],
    );
  }, 30000);
  afterAll(async () => {
    try {
      if (db) {
        await db.query('ROLLBACK');
        await db.end();
      }
    } finally {
      await module?.close();
    }
  });

  it('counts lessons and coverage without multiplying grants and distinguishes unique people', async () => {
    const result = await service.query(query());
    expect(result.total).toBe(2);
    expect(result.summary).toMatchObject({
      enrolledStudents: 2,
      activeEnrollments: 2,
      averageProgress: 16.5,
      progressDenominator: 2,
      withCoverage: 1,
      withoutCoverage: 1,
      inactiveStudents: 1,
      pendingSubmissions: 1,
      gradedSubmissions: 1,
      activeParticipants: 1,
      unassignedCourses: 0,
    });
    const student = result.items.find((r) => r.id === enrollment1)!;
    expect(student.values).toMatchObject({
      progress: 33,
      lessons: 3,
      completed: 1,
      coverage: true,
      inactive: true,
    });
    expect(
      result.items.find((r) => r.id === enrollment2)?.values,
    ).toMatchObject({ progress: 0, coverage: false, inactive: false });
  });
  it('applies stage, academic state, course state and course filters together', async () => {
    const result = await service.query(
      query({
        stage: 'sin_cobertura',
        state: 'activa',
        courseState: 'publicado',
      }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(enrollment2);
    expect((await service.query(query({ state: 'suspendida' }))).total).toBe(0);
    expect(
      (await service.query(query({ courseState: 'archivado' }))).total,
    ).toBe(0);
  });
  it('paginates with stable numeric sorting and retains total on empty pages', async () => {
    const first = await service.query(
      query({ pageSize: 1, sort: 'progress', direction: 'desc' }),
    );
    const second = await service.query(
      query({ pageSize: 1, page: 2, sort: 'progress', direction: 'desc' }),
    );
    expect(first.total).toBe(2);
    expect(first.items[0].id).toBe(enrollment1);
    expect(second.items[0].id).toBe(enrollment2);
    const empty = await service.query(query({ page: 3, pageSize: 1 }));
    expect(empty.total).toBe(2);
    expect(empty.items).toEqual([]);
  });
  it('uses null when there is no published content and excludes it from the mean', async () => {
    const result = await service.query(query({ courseId: emptyCourse }));
    expect(result.summary.averageProgress).toBeNull();
    expect(result.summary.progressDenominator).toBe(0);
    expect(result.items[0].values.progress).toBeNull();
  });
  it('returns real course and teacher counts and their assigned course links', async () => {
    const courses = await service.query(query({ indicator: 'courses' }));
    expect(courses.items[0].values).toMatchObject({
      students: 2,
      enrollments: 2,
      lessons: 3,
      completed: 1,
      tasks: 2,
      submissions: 1,
      pending: 1,
    });
    const teachers = await service.query(query({ indicator: 'teachers' }));
    expect(teachers.total).toBe(1);
    expect(teachers.items[0].id).toBe(teacher);
    expect(teachers.items[0].courses[0].id).toBe(course);
    expect(teachers.items[0].values.graded).toBe(1);
  });
  it('filters requests and limits event counts to the chosen UTC window', async () => {
    const pending = await service.query(
      query({ indicator: 'requests', requestState: 'pendiente' }),
    );
    expect(pending.total).toBe(1);
    expect(
      (
        await service.query(
          query({ indicator: 'requests', requestState: 'rechazada' }),
        )
      ).total,
    ).toBe(0);
    const month = await service.query(
      query({ indicator: 'courses', days: '30' }),
    );
    expect(month.items[0].values.submissions).toBe(2);
  });
  it('exports all filtered pages safely and never exports private data', async () => {
    const csv = await service.export(query({ pageSize: 1, page: 2 }));
    expect(csv.rows).toBe(2);
    expect(csv.csv).toContain('"\'=2+3 Prueba"');
    expect(csv.csv).toContain('"Materia, ""0"""');
    expect(csv.csv).not.toMatch(
      /password_hash|web_visitor_hash|example\.test|Contenido privado|session/,
    );
  });
  it('represents days before analytics was enabled as unmeasured', async () => {
    const result = await service.query(
      query({ indicator: 'traffic', days: '90' }),
    );
    for (const p of result.traffic.trend)
      if (p.day < result.trackingSince.slice(0, 10))
        expect(p.visitors).toBeNull();
    expect(result.total).toBe(90);
  });
});
