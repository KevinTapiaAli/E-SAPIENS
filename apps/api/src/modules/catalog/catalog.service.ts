import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PublicCourse,
  PublicCourseDetail,
  PublicCourseModule,
  PublicPage,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { PublicListQueryDto } from '../../common/http/dto/public-list-query.dto';

const courseFields = `c.id, c.slug, c.titulo AS title, c.descripcion AS description,
  cat.nombre AS category, c.nivel AS level, c.idioma AS language,
  c.duracion_horas::float8 AS "durationHours"`;

@Injectable()
export class CatalogService {
  constructor(private readonly database: DatabaseService) {}

  async list(query: PublicListQueryDto): Promise<PublicPage<PublicCourse>> {
    const result = await this.database.query<
      PublicCourse & Record<string, unknown>
    >(
      `SELECT ${courseFields}
       FROM lms.cursos c JOIN lms.categorias_curso cat ON cat.id = c.categoria_id
       WHERE c.estado = 'publicado'
         AND ($1::text = '' OR strpos(lower(c.titulo || ' ' || c.descripcion), lower($1)) > 0)
         AND ($2::uuid IS NULL OR c.id > $2::uuid)
       ORDER BY c.id LIMIT $3`,
      [query.q ?? '', query.cursor ?? null, query.limit + 1],
    );
    const items = result.rows.slice(0, query.limit);
    return {
      items,
      nextCursor:
        result.rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async detail(slug: string): Promise<PublicCourseDetail> {
    // Un único SELECT mantiene publicación y temario bajo la misma instantánea.
    // El temario nunca incluye contenido de lecciones, archivos ni enlaces privados.
    const result = await this.database.query<
      PublicCourse & { objectives: string; modules: PublicCourseModule[] }
    >(
      `SELECT ${courseFields}, c.objetivos AS objectives,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', m.id, 'title', m.titulo,
         'lessons', COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id', l.id, 'title', l.titulo, 'type', l.tipo, 'durationMinutes', l.duracion_minutos
         ) ORDER BY l.orden) FROM lms.lecciones l
           WHERE l.modulo_id = m.id AND l.curso_id = c.id AND l.publicada), '[]'::jsonb)
       ) ORDER BY m.orden) FROM lms.modulos m
         WHERE m.curso_id = c.id AND m.publicado), '[]'::jsonb) AS modules
       FROM lms.cursos c JOIN lms.categorias_curso cat ON cat.id = c.categoria_id
       WHERE c.slug = $1 AND c.estado = 'publicado'`,
      [slug],
    );
    const course = result.rows[0];
    if (!course)
      throw new NotFoundException({
        code: 'COURSE_NOT_FOUND',
        message: 'El curso no está disponible.',
      });
    return course;
  }
}
