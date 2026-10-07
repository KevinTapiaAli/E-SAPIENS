import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Client, PoolClient } from 'pg';
import request from 'supertest';
import { hash as bcryptHash } from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http/configure-http';
import { DatabaseService } from '../src/infrastructure/database/database.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { hashPassword } from '../src/modules/identity/password';
import { tokenDigest } from '../src/modules/identity/identity-security.service';

describe('Identidad, permisos y sesiones contra PostgreSQL/Redis (e2e)', () => {
  let app: INestApplication;
  let db: Client;
  let origin: string;
  const marker = `identity-${randomUUID()}`;
  const password = randomBytes(24).toString('hex');
  const identities = {
    estudiante: { id: randomUUID(), email: `${marker}-student@example.test` },
    docente: { id: randomUUID(), email: `${marker}-teacher@example.test` },
    administrador: { id: randomUUID(), email: `${marker}-admin@example.test` },
  };
  let studentCookie: string;
  let teacherCookie: string;
  let adminCookie: string;
  let newStudentId: string;
  const registeredEmail = `${marker}-new@example.test`;
  const ownCourse = randomUUID();
  const otherCourse = randomUUID();
  const managedCourse = randomUUID();
  let enrolledCookie: string;
  let savepoint = 0;

  const post = (path: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/identity/${path}`)
      .set('Origin', origin);
  const get = (path: string, cookie?: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/identity/${path}`)
      .set('Cookie', cookie ?? '');
  const cookieFrom = (headers: Record<string, unknown>): string => {
    const value = headers['set-cookie'];
    if (!Array.isArray(value) || typeof value[0] !== 'string')
      throw new Error('Missing session cookie');
    return value[0].split(';')[0];
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({
        query: (sql: string, params: unknown[]) => db.query(sql, params),
        transaction: async <T>(
          work: (client: PoolClient) => Promise<T>,
        ): Promise<T> => {
          const name = `identity_test_${++savepoint}`;
          await db.query(`SAVEPOINT ${name}`);
          try {
            const value = await work(db as unknown as PoolClient);
            await db.query(`RELEASE SAVEPOINT ${name}`);
            return value;
          } catch (error) {
            await db.query(`ROLLBACK TO SAVEPOINT ${name}`);
            await db.query(`RELEASE SAVEPOINT ${name}`);
            throw error;
          }
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    const config = moduleRef.get(ConfigService);
    const url = new URL(config.getOrThrow<string>('DATABASE_URL'));
    if (
      config.get('NODE_ENV') === 'production' ||
      !['local', 'test'].includes(config.get<string>('APP_ENV') ?? '') ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['/esapiens', '/esapiens_test'].includes(url.pathname)
    )
      throw new Error('Identity E2E requires a local test database.');
    origin = new URL(config.getOrThrow<string>('APP_URL')).origin;
    db = new Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 3000,
    });
    await db.connect();
    await db.query('BEGIN');
    const encoded = await hashPassword(password);
    for (const [role, identity] of Object.entries(identities)) {
      await db.query(
        "INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado,aprobado_en) VALUES($1,$2,$3,'Prueba','Identidad',$4,'aprobado',now())",
        [identity.id, identity.email, identity.id, encoded],
      );
      const assigned = await db.query(
        'INSERT INTO lms.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM lms.roles WHERE codigo=$2 RETURNING id',
        [identity.id, role],
      );
      if (assigned.rowCount !== 1)
        throw new Error('Run db:migrate before identity E2E');
    }
    await db.query(
      "INSERT INTO lms.perfiles_docentes(usuario_id,especialidad) VALUES($1,'Pruebas')",
      [identities.docente.id],
    );
    const category = randomUUID();
    await db.query(
      'INSERT INTO lms.categorias_curso(id,nombre,slug) VALUES($1,$2,$2)',
      [category, marker],
    );
    for (const course of [ownCourse, otherCourse]) {
      await db.query(
        "INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,creado_por) VALUES($1::uuid,$2,$1::text,$1::text,'Prueba','Prueba','Inicial',1,$3)",
        [course, category, identities.administrador.id],
      );
    }
    await db.query(
      'INSERT INTO lms.curso_docentes(curso_id,docente_id) VALUES($1,$2)',
      [ownCourse, identities.docente.id],
    );
    await db.query(
      'INSERT INTO lms.inscripciones(curso_id,estudiante_id) VALUES($1,$2)',
      [ownCourse, identities.estudiante.id],
    );
    // Isolated, expiring Redis keys; exercise the real atomic limiter without FLUSHDB.
    const redis = moduleRef.get(RedisService);
    const consume = redis.consume.bind(redis);
    jest
      .spyOn(redis, 'consume')
      .mockImplementation((key, seconds) =>
        consume(`${marker}:${key}`, seconds),
      );
    configureHttp(app);
    await app.init();
    for (const [role, identity] of Object.entries(identities)) {
      const result = await post('login')
        .send({ email: identity.email, password })
        .expect(200);
      const cookie = cookieFrom(result.headers);
      if (role === 'estudiante') studentCookie = cookie;
      if (role === 'docente') teacherCookie = cookie;
      if (role === 'administrador') adminCookie = cookie;
    }
  }, 30000);

  afterAll(async () => {
    try {
      if (db) {
        await db.query('ROLLBACK');
        await db.end();
      }
    } finally {
      if (app) await app.close();
    }
  });

  it('requiere sesión y bloquea accesos cruzados entre los tres perfiles', async () => {
    await get('me').expect(401);
    await get('dashboard/administrador', studentCookie).expect(403);
    await get('dashboard/docente', studentCookie).expect(403);
    await get('dashboard/administrador', teacherCookie).expect(403);
    await get('dashboard/estudiante', adminCookie).expect(403);
    await get('pending', teacherCookie).expect(403);
    await get('dashboard/administrador', adminCookie).expect(200);
  });

  it('solo consulta inscripciones propias y cursos asignados, sin hashes ni tokens', async () => {
    for (const [role, cookie] of [
      ['estudiante', studentCookie],
      ['docente', teacherCookie],
    ]) {
      const result = await get(`dashboard/${role}`, cookie).expect(200);
      expect(result.body.courses.map((c: { id: string }) => c.id)).toEqual([
        ownCourse,
      ]);
      expect(JSON.stringify(result.body)).not.toContain(otherCourse);
      expect(result.body.user).not.toHaveProperty('password_hash');
      expect(result.body.user).not.toHaveProperty('token');
    }
  });

  it('rechaza CSRF y roles o IDs inyectados por el cliente', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/identity/login')
      .send({ email: identities.estudiante.email, password })
      .expect(403);
    await post('login')
      .set('Origin', 'https://evil.example')
      .send({ email: identities.estudiante.email, password })
      .expect(403);
    await post('logout')
      .set('Cookie', studentCookie)
      .set('Sec-Fetch-Site', 'cross-site')
      .send({})
      .expect(403);
    await post('login')
      .send({
        email: identities.estudiante.email,
        password,
        role: 'administrador',
      })
      .expect(400);
    await post('register')
      .send({
        email: registeredEmail,
        password,
        firstName: 'Ana',
        lastName: 'Prueba',
        roles: ['administrador'],
      })
      .expect(400);
  });

  it('registra pendiente, no sobreescribe duplicados y exige aprobación para entrar', async () => {
    const body = {
      email: registeredEmail,
      password,
      firstName: 'Ana',
      lastName: 'Prueba',
    };
    const first = await post('register').send(body).expect(202);
    const second = await post('register')
      .send({ ...body, firstName: 'No sobrescribir' })
      .expect(202);
    expect(first.body).toEqual(second.body);
    const row = await db.query<{ id: string; nombres: string; estado: string }>(
      'SELECT id,nombres,estado FROM lms.usuarios WHERE email=$1',
      [registeredEmail],
    );
    newStudentId = row.rows[0].id;
    expect(row.rows[0].nombres).toBe('Ana');
    expect(row.rows[0].estado).toBe('pendiente');
    const login = await post('login')
      .send({ email: registeredEmail, password })
      .expect(403);
    expect(login.body.error.code).toBe('ACCOUNT_NOT_APPROVED');
    const wrong = await post('login')
      .send({ email: registeredEmail, password: 'incorrecta' })
      .expect(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('autoriza revisión solo al administrador, registra auditoría y permite el acceso aprobado', async () => {
    await post(`accounts/${newStudentId}/review`)
      .set('Cookie', studentCookie)
      .send({ decision: 'aprobar', reason: 'Datos verificados' })
      .expect(403);
    await get('pending?cursor=no-uuid', adminCookie).expect(400);
    await get('pending', adminCookie).expect(200);
    await post(`accounts/${newStudentId}/review`)
      .set('Cookie', adminCookie)
      .send({ decision: 'aprobar', reason: 'Datos verificados' })
      .expect(200);
    await post(`accounts/${newStudentId}/review`)
      .set('Cookie', adminCookie)
      .send({ decision: 'aprobar', reason: 'Repetir revisión' })
      .expect(409);
    const history = await db.query(
      'SELECT responsable_id FROM lms.historial_estado_usuario WHERE usuario_id=$1 AND estado_nuevo=$2',
      [newStudentId, 'aprobado'],
    );
    expect(history.rows[0].responsable_id).toBe(identities.administrador.id);
    const audit = await db.query(
      "SELECT actor_id FROM lms.auditoria WHERE registro_id=$1 AND accion='UPDATE' ORDER BY created_at DESC",
      [newStudentId],
    );
    expect(audit.rows[0].actor_id).toBe(identities.administrador.id);
    const login = await post('login')
      .send({ email: registeredEmail, password })
      .expect(200);
    expect(login.body.roles).toEqual(['estudiante']);
    enrolledCookie = cookieFrom(login.headers);
  });

  it('emite cookies HttpOnly/SameSite y almacena solo el digest, rota y revoca la sesión', async () => {
    const login = await post('login')
      .set('Cookie', studentCookie)
      .send({ email: identities.estudiante.email, password })
      .expect(200);
    const newCookie = cookieFrom(login.headers);
    expect(newCookie).not.toBe(studentCookie);
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(login.headers['cache-control']).toBe('no-store');
    const token = newCookie.split('=')[1];
    const stored = await db.query(
      'SELECT token_hash FROM lms.sesiones WHERE token_hash=$1',
      [tokenDigest(token)],
    );
    expect(stored.rows[0].token_hash).not.toEqual(token);
    await get('me', studentCookie).expect(401);
    await get('me', newCookie).expect(200);
    await post('logout').set('Cookie', newCookie).send({}).expect(200);
    await get('me', newCookie).expect(401);
    studentCookie = cookieFrom(
      (
        await post('login')
          .send({ email: identities.estudiante.email, password })
          .expect(200)
      ).headers,
    );
  });

  it('revoca acceso al suspender usuario, caducar sesión o retirar permisos', async () => {
    await db.query("UPDATE lms.usuarios SET estado='suspendido' WHERE id=$1", [
      identities.docente.id,
    ]);
    await get('me', teacherCookie).expect(401);
    await db.query("UPDATE lms.usuarios SET estado='aprobado' WHERE id=$1", [
      identities.docente.id,
    ]);
    await db.query(
      "UPDATE lms.sesiones SET created_at=now()-interval '2 hours',vence_en=now()-interval '1 hour' WHERE token_hash=$1",
      [tokenDigest(teacherCookie.split('=')[1])],
    );
    await get('me', teacherCookie).expect(401);
    await db.query('SAVEPOINT remove_permission');
    await db.query(
      "DELETE FROM lms.rol_permisos WHERE rol_id=(SELECT id FROM lms.roles WHERE codigo='estudiante') AND permiso_id=(SELECT id FROM lms.permisos WHERE codigo='dashboard.student')",
    );
    await get('dashboard/estudiante', studentCookie).expect(403);
    await db.query('ROLLBACK TO SAVEPOINT remove_permission');
    await db.query('RELEASE SAVEPOINT remove_permission');
  });

  it('actualiza bcrypt legado a Argon2id tras credenciales correctas', async () => {
    const encoded = await bcryptHash(password, 10);
    await db.query('UPDATE lms.usuarios SET password_hash=$2 WHERE id=$1', [
      identities.docente.id,
      encoded,
    ]);
    const upgradedLogin = await post('login')
      .send({ email: identities.docente.email, password })
      .expect(200);
    teacherCookie = cookieFrom(upgradedLogin.headers);
    const stored = await db.query(
      'SELECT password_hash FROM lms.usuarios WHERE id=$1',
      [identities.docente.id],
    );
    expect(stored.rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });

  it('limita intentos reiterados con Redis y rechaza cuentas desconocidas', async () => {
    const email = `${marker}-unknown@example.test`;
    for (let i = 0; i < 10; i++)
      await post('login').send({ email, password }).expect(401);
    const limited = await post('login').send({ email, password }).expect(429);
    expect(limited.body.error.code).toBe('AUTH_RATE_LIMITED');
  });

  const academicGet = (path: string, cookie = adminCookie) =>
    request(app.getHttpServer())
      .get(`/api/v1/academic/${path}`)
      .set('Cookie', cookie);
  const academicPost = (path: string, cookie = adminCookie) =>
    request(app.getHttpServer())
      .post(`/api/v1/academic/${path}`)
      .set('Cookie', cookie)
      .set('Origin', origin);

  it('protege listas y operaciones del portal según rol y permiso', async () => {
    await academicGet('people', studentCookie).expect(403);
    await academicGet('enrollments', teacherCookie).expect(403);
    await academicGet('courses?role=administrador', studentCookie).expect(403);
    await academicGet('overview/administrador', teacherCookie).expect(403);
    await academicGet(
      'courses?role=estudiante&usuario_id=' + identities.administrador.id,
      studentCookie,
    ).expect(400);
    await academicPost('enrollments', studentCookie)
      .send({
        personId: newStudentId,
        courseId: ownCourse,
        reason: 'Intento sin permiso',
      })
      .expect(403);
    await academicPost('assignments', teacherCookie)
      .send({
        personId: identities.docente.id,
        courseId: ownCourse,
        reason: 'Intento sin permiso',
      })
      .expect(403);
    await academicGet('people?limit=25').expect(400);
    await academicGet('people?cursor=invalid').expect(400);
    await db.query('SAVEPOINT portal_permission');
    await db.query(
      "DELETE FROM lms.rol_permisos WHERE rol_id=(SELECT id FROM lms.roles WHERE codigo='administrador') AND permiso_id=(SELECT id FROM lms.permisos WHERE codigo='academic.read')",
    );
    await academicGet('people').expect(403);
    await db.query('ROLLBACK TO SAVEPOINT portal_permission');
    await db.query('RELEASE SAVEPOINT portal_permission');
  });

  it('matricula de forma idempotente, registra motivo/actor y no concede acceso privado', async () => {
    const category = (
      await db.query('SELECT categoria_id FROM lms.cursos WHERE id=$1', [
        ownCourse,
      ])
    ).rows[0].categoria_id as string;
    await db.query(
      "INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,estado,creado_por,aprobado_por,aprobado_en) VALUES($1,$2,$3,$3,'Prueba','Prueba','Inicial',1,'publicado',$4,$4,now())",
      [
        managedCourse,
        category,
        `${marker}-managed`,
        identities.administrador.id,
      ],
    );
    const dto = {
      personId: newStudentId,
      courseId: managedCourse,
      reason: 'Autorización administrativa de prueba',
    };
    await academicPost('enrollments')
      .set('Origin', 'https://evil.example')
      .send(dto)
      .expect(403);
    await academicPost('enrollments')
      .send({ ...dto, courseId: ownCourse })
      .expect(409);
    await academicPost('enrollments')
      .send({ ...dto, personId: identities.docente.id })
      .expect(409);
    const first = await academicPost('enrollments').send(dto).expect(200);
    const second = await academicPost('enrollments').send(dto).expect(200);
    expect(second.body.id).toBe(first.body.id);
    const record = await db.query(
      'SELECT motivo FROM lms.inscripciones WHERE id=$1',
      [first.body.id],
    );
    expect(record.rows[0].motivo).toBe(dto.reason);
    const audit = await db.query(
      "SELECT actor_id FROM lms.auditoria WHERE registro_id=$1 AND accion='INSERT'",
      [first.body.id],
    );
    expect(audit.rows[0].actor_id).toBe(identities.administrador.id);
    const grants = await db.query(
      'SELECT id FROM lms.accesos_modulo WHERE inscripcion_id=$1',
      [first.body.id],
    );
    expect(grants.rowCount).toBe(0);
    const list = await academicGet(
      'courses?role=estudiante',
      enrolledCookie,
    ).expect(200);
    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual([
      managedCourse,
    ]);
    await db.query(
      "UPDATE lms.inscripciones SET estado='suspendida' WHERE id=$1",
      [first.body.id],
    );
    await academicPost('enrollments').send(dto).expect(409);
    expect(
      (
        await db.query('SELECT estado FROM lms.inscripciones WHERE id=$1', [
          first.body.id,
        ])
      ).rows[0].estado,
    ).toBe('suspendida');
    await db.query("UPDATE lms.inscripciones SET estado='activa' WHERE id=$1", [
      first.body.id,
    ]);
  });

  it('asigna docentes con auditoría y excluye otros cursos del portal docente', async () => {
    const dto = {
      personId: identities.docente.id,
      courseId: managedCourse,
      reason: 'Asignación docente de prueba',
      qualificationConfirmed: true,
    };
    await academicPost('assignments')
      .send({ ...dto, personId: newStudentId })
      .expect(409);
    const unreviewed = await academicPost('assignments').send(dto).expect(409);
    expect(unreviewed.body.error.code).toBe('TEACHER_QUALIFICATION_REQUIRED');
    await db.query(
      'UPDATE lms.perfiles_docentes SET revision_formacion=$2,revisado_por=$3,revisado_en=now() WHERE usuario_id=$1',
      [
        identities.docente.id,
        'Formación revisada para la asignación de prueba',
        identities.administrador.id,
      ],
    );
    await academicPost('assignments')
      .send({ ...dto, qualificationConfirmed: false })
      .expect(409);
    const first = await academicPost('assignments').send(dto).expect(200);
    const second = await academicPost('assignments').send(dto).expect(200);
    expect(second.body.id).toBe(first.body.id);
    const stored = await db.query(
      'SELECT asignado_por,motivo FROM lms.curso_docentes WHERE id=$1',
      [first.body.id],
    );
    expect(stored.rows[0]).toEqual({
      asignado_por: identities.administrador.id,
      motivo: dto.reason,
    });
    const audit = await db.query(
      "SELECT actor_id FROM lms.auditoria WHERE tabla='curso_docentes' AND registro_id=$1",
      [first.body.id],
    );
    expect(audit.rows[0].actor_id).toBe(identities.administrador.id);
    const result = await academicGet(
      'courses?role=docente',
      teacherCookie,
    ).expect(200);
    expect(
      result.body.items.map((item: { id: string }) => item.id).sort(),
    ).toEqual([ownCourse, managedCourse].sort());
    expect(JSON.stringify(result.body)).not.toContain(otherCourse);
    await db.query("UPDATE lms.usuarios SET estado='suspendido' WHERE id=$1", [
      identities.docente.id,
    ]);
    await academicPost('assignments').send(dto).expect(409);
    await db.query("UPDATE lms.usuarios SET estado='aprobado' WHERE id=$1", [
      identities.docente.id,
    ]);
  });

  it('muestra progreso propio persistido y omite cuerpos privados y avance de otros estudiantes', async () => {
    const module = randomUUID();
    const lesson = randomUUID();
    const hiddenLesson = randomUUID();
    await db.query(
      "INSERT INTO lms.modulos(id,curso_id,titulo,descripcion,orden,publicado) VALUES($1,$2,'Módulo de prueba','Prueba',1,true)",
      [module, managedCourse],
    );
    await db.query(
      "INSERT INTO lms.lecciones(id,curso_id,modulo_id,titulo,tipo,contenido,orden,duracion_minutos,publicada) VALUES($1,$2,$3,'Visible','lectura','SECRET_CLASSROOM',1,10,true),($4,$2,$3,'Oculta','lectura','SECRET_CLASSROOM',2,10,false)",
      [lesson, managedCourse, module, hiddenLesson],
    );
    const enrollment = (
      await db.query(
        'SELECT id FROM lms.inscripciones WHERE estudiante_id=$1 AND curso_id=$2',
        [newStudentId, managedCourse],
      )
    ).rows[0].id as string;
    await db.query(
      'INSERT INTO lms.progreso_lecciones(inscripcion_id,curso_id,leccion_id,completado_en) VALUES($1,$2,$3,now())',
      [enrollment, managedCourse, lesson],
    );
    const result = await academicGet(
      'overview/estudiante',
      enrolledCookie,
    ).expect(200);
    expect(result.body.courses[0]).toMatchObject({
      id: managedCourse,
      totalLessons: 1,
      completedLessons: 1,
    });
    expect(result.body.distribution).toEqual([
      { label: 'Completadas', value: 1 },
      { label: 'Por completar', value: 0 },
    ]);
    expect(JSON.stringify(result.body)).not.toContain('SECRET_CLASSROOM');
    const other = await academicGet(
      'overview/estudiante',
      studentCookie,
    ).expect(200);
    expect(other.body.courses.map((item: { id: string }) => item.id)).toEqual([
      ownCourse,
    ]);
    expect(other.body.distribution[0].value).toBe(0);
    await academicGet('overview/docente', teacherCookie).expect(200);
    await academicGet('overview/administrador').expect(200);
  });

  it('pagina y busca personas/cursos/matrículas sin exponer credenciales', async () => {
    const people = await academicGet(`people?q=${marker}&limit=1`).expect(200);
    expect(people.body.items).toHaveLength(1);
    expect(people.body.nextCursor).toEqual(expect.any(String));
    const next = await academicGet(
      `people?q=${marker}&limit=1&cursor=${people.body.nextCursor}`,
    ).expect(200);
    expect(next.body.items[0].id).not.toBe(people.body.items[0].id);
    expect(Object.keys(people.body.items[0]).sort()).toEqual(
      [
        'id',
        'firstName',
        'lastName',
        'email',
        'roles',
        'status',
        'specialty',
        'curriculumUrl',
        'qualificationReview',
        'qualificationReviewedAt',
        'profileRevision',
      ].sort(),
    );
    const teachers = await academicGet(
      `people?q=${marker}&kind=docente&state=aprobado`,
    ).expect(200);
    expect(
      teachers.body.items.map((person: { id: string }) => person.id),
    ).toEqual([identities.docente.id]);
    const courses = await academicGet(
      `courses?role=administrador&q=${marker}`,
    ).expect(200);
    expect(
      courses.body.items.map((course: { id: string }) => course.id),
    ).toContain(managedCourse);
    const enrollments = await academicGet(`enrollments?q=${marker}`).expect(
      200,
    );
    expect(enrollments.body.items).toHaveLength(1);
    const hostile = await academicGet("people?q=' OR 1=1 --").expect(200);
    expect(hostile.body.items).toEqual([]);
  });
});
