import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http/configure-http';
import { DatabaseService } from '../src/infrastructure/database/database.service';

describe('Catálogo público contra PostgreSQL (e2e)', () => {
  let app: INestApplication;
  let database: Client;
  const marker = `catalog-${randomUUID()}`;
  const userId = randomUUID();
  const categoryId = randomUUID();
  const courseIds = [randomUUID(), randomUUID(), randomUUID()];
  const draftId = randomUUID();
  const archivedId = randomUUID();
  const moduleId = randomUUID();
  const hiddenModuleId = randomUUID();
  const libraryIds = [randomUUID(), randomUUID()];
  const privateItemId = randomUUID();
  const unpublishedItemId = randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({
        query: (sql: string, params: unknown[]) => database.query(sql, params),
      })
      .compile();
    app = moduleRef.createNestApplication();
    configureHttp(app);
    const config = moduleRef.get(ConfigService);
    const url = new URL(config.getOrThrow<string>('DATABASE_URL'));
    if (
      config.get('NODE_ENV') === 'production' ||
      !['local', 'test'].includes(config.get<string>('APP_ENV') ?? '') ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['/esapiens', '/esapiens_test'].includes(url.pathname)
    ) {
      throw new Error(
        'Las pruebas de integración solo pueden usar PostgreSQL local con APP_ENV local/test.',
      );
    }
    database = new Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
    });
    await database.connect();
    // La API usa esta misma conexión: las fixtures son visibles solo en la transacción.
    // ROLLBACK elimina todas las inserciones sin borrar ni cambiar datos preexistentes.
    await database.query('BEGIN');
    await database.query(
      `INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado)
      VALUES($1,$2,$3,'Prueba','Catálogo',$4,'suspendido')`,
      [
        userId,
        `${marker}@example.test`,
        marker,
        randomBytes(48).toString('hex'),
      ],
    );
    await database.query(
      'INSERT INTO lms.categorias_curso(id,nombre,slug) VALUES($1,$2,$2)',
      [categoryId, marker],
    );
    for (const [index, id] of [...courseIds, draftId, archivedId].entries()) {
      const state =
        id === draftId
          ? 'borrador'
          : id === archivedId
            ? 'archivado'
            : 'publicado';
      await database.query(
        `INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,estado,creado_por,aprobado_por,aprobado_en)
        VALUES($1,$2,$3,$3,'Descripción pública','Objetivos públicos','Inicial',10,$4,$5,$5,now())`,
        [id, categoryId, `${marker}-${index}`, state, userId],
      );
    }
    await database.query(
      `INSERT INTO lms.modulos(id,curso_id,titulo,descripcion,orden,publicado) VALUES
      ($1,$3,'Módulo visible','Descripción interna del módulo',1,true),($2,$3,'Módulo oculto','No público',2,false)`,
      [moduleId, hiddenModuleId, courseIds[0]],
    );
    await database.query(
      `INSERT INTO lms.lecciones(curso_id,modulo_id,titulo,tipo,contenido,orden,duracion_minutos,publicada) VALUES
      ($1,$2,'Lección visible','lectura','SECRET_LESSON_CONTENT',1,20,true),
      ($1,$2,'Lección oculta','lectura','SECRET_LESSON_CONTENT',2,20,false),
      ($1,$3,'Lección de módulo oculto','lectura','SECRET_LESSON_CONTENT',1,20,true)`,
      [courseIds[0], moduleId, hiddenModuleId],
    );
    for (const [index, id] of [
      ...libraryIds,
      privateItemId,
      unpublishedItemId,
    ].entries()) {
      await database.query(
        `INSERT INTO lms.biblioteca_items(id,titulo,tipo,descripcion,ficha_publica,publicado)
        VALUES($1,$2,'guia','Descripción bibliográfica',$3,$4)`,
        [
          id,
          `${marker}-book-${index}`,
          id !== privateItemId,
          id !== unpublishedItemId,
        ],
      );
    }
    const authorId = randomUUID();
    await database.query('INSERT INTO lms.autores(id,nombre) VALUES($1,$2)', [
      authorId,
      'Autor de prueba',
    ]);
    await database.query(
      'INSERT INTO lms.biblioteca_autores(item_id,autor_id,orden) VALUES($1,$2,1)',
      [libraryIds[0], authorId],
    );
    await database.query(
      `INSERT INTO lms.biblioteca_secciones(item_id,titulo,orden,pagina_inicio,pagina_fin)
      VALUES($1,'Tema publicado',1,1,8)`,
      [libraryIds[0]],
    );
    const fileId = randomUUID();
    await database.query(
      `INSERT INTO lms.archivos(id,propietario_id,nombre,proveedor,clave_objeto,mime_type)
      VALUES($1,$2,'Material privado','s3',$3,'application/pdf')`,
      [fileId, userId, `SECRET_FILE_${marker}`],
    );
    await database.query(
      `INSERT INTO lms.biblioteca_versiones(item_id,numero,archivo_id,cambio,vigente)
      VALUES($1,1,$2,'Archivo privado',true)`,
      [libraryIds[0], fileId],
    );
    await app.init();
  }, 20000);

  afterAll(async () => {
    try {
      if (database) {
        await database.query('ROLLBACK');
        await database.end();
      }
    } finally {
      if (app) await app.close();
    }
  });

  it('lista únicamente cursos publicados y pagina sin duplicarlos', async () => {
    const first = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .query({ q: marker, limit: 2 })
      .expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .query({ q: marker, limit: 2, cursor: first.body.nextCursor })
      .expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();
    const ids = [...first.body.items, ...second.body.items].map(
      (course: { id: string }) => course.id,
    );
    expect(ids.sort()).toEqual([...courseIds].sort());
    expect(Object.keys(first.body.items[0]).sort()).toEqual(
      [
        'category',
        'description',
        'durationHours',
        'id',
        'language',
        'level',
        'slug',
        'title',
      ].sort(),
    );
  });

  it('solo muestra metadatos de módulos y lecciones publicados', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/courses/${marker}-0`)
      .expect(200);
    expect(response.body.modules).toHaveLength(1);
    expect(response.body.modules[0].title).toBe('Módulo visible');
    expect(response.body.modules[0].lessons).toHaveLength(1);
    expect(response.body.modules[0].lessons[0].title).toBe('Lección visible');
    expect(Object.keys(response.body.modules[0].lessons[0]).sort()).toEqual([
      'durationMinutes',
      'id',
      'title',
      'type',
    ]);
    expect(JSON.stringify(response.body)).not.toContain('SECRET_');
    expect(response.body).not.toHaveProperty('creado_por');
  });

  it.each([3, 4, 99])(
    'responde 404 para cursos no públicos o inexistentes (%s)',
    async (index) => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/courses/${marker}-${index}`)
        .expect(404);
      expect(response.body.error.code).toBe('COURSE_NOT_FOUND');
    },
  );

  it('respeta búsqueda literal y no interpreta SQL ni comodines del usuario', async () => {
    for (const q of [`${marker}' OR 1=1 --`, '%', `${marker}-inexistente`]) {
      const response = await request(app.getHttpServer())
        .get('/api/v1/courses')
        .query({ q })
        .expect(200);
      // El comodín es literal; las fixtures no contienen %, pero podrían existir datos ajenos.
      if (q !== '%') expect(response.body.items).toEqual([]);
      expect(
        response.body.items.some((item: { id: string }) => item.id === draftId),
      ).toBe(false);
    }
  });

  it.each(['/courses', '/library'])(
    'valida límites, cursor y parámetros desconocidos en %s',
    async (path) => {
      for (const query of [
        { limit: 0 },
        { limit: 25 },
        { limit: 1.5 },
        { cursor: 'invalido' },
        { q: 'x'.repeat(101) },
        { estado: 'borrador' },
      ]) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1${path}`)
          .query(query)
          .expect(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    },
  );

  it('filtra fichas privadas y borradores también al paginar la biblioteca', async () => {
    const first = await request(app.getHttpServer())
      .get('/api/v1/library')
      .query({ q: marker, limit: 1 })
      .expect(200);
    expect(first.body.items).toHaveLength(1);
    const second = await request(app.getHttpServer())
      .get('/api/v1/library')
      .query({ q: marker, limit: 1, cursor: first.body.nextCursor })
      .expect(200);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();
    const ids: string[] = [first.body.items[0].id, second.body.items[0].id];
    expect(ids.sort()).toEqual([...libraryIds].sort());
  });

  it('entrega autoría y temas de biblioteca sin entregar archivos privados', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/library/${libraryIds[0]}`)
      .expect(200);
    expect(response.body.authors).toEqual(['Autor de prueba']);
    expect(response.body.sections).toEqual([
      { title: 'Tema publicado', pageStart: 1, pageEnd: 8 },
    ]);
    expect(Object.keys(response.body).sort()).toEqual(
      [
        'authors',
        'description',
        'id',
        'isbn',
        'publisher',
        'sections',
        'title',
        'type',
        'year',
      ].sort(),
    );
    expect(JSON.stringify(response.body)).not.toContain('SECRET_');
  });

  it.each([privateItemId, unpublishedItemId, randomUUID()])(
    'responde 404 sin revelar fichas restringidas (%s)',
    async (id) => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/library/${id}`)
        .expect(404);
      expect(response.body.error.code).toBe('LIBRARY_ITEM_NOT_FOUND');
    },
  );

  it('rechaza identificadores de biblioteca inválidos', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/library/no-es-uuid')
      .expect(400);
  });
});
