import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PublicLibraryItem,
  PublicLibraryDetail,
  PublicPage,
} from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { PublicListQueryDto } from '../../common/http/dto/public-list-query.dto';

const libraryFields = `b.id, b.titulo AS title, b.tipo AS type, b.descripcion AS description,
  b.editorial AS publisher, b.anio AS year, b.isbn,
  COALESCE((SELECT jsonb_agg(a.nombre ORDER BY ba.orden)
    FROM lms.biblioteca_autores ba JOIN lms.autores a ON a.id = ba.autor_id
    WHERE ba.item_id = b.id), '[]'::jsonb) AS authors`;

@Injectable()
export class LibraryService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    query: PublicListQueryDto,
  ): Promise<PublicPage<PublicLibraryItem>> {
    const result = await this.database.query<
      PublicLibraryItem & Record<string, unknown>
    >(
      `SELECT ${libraryFields} FROM lms.biblioteca_items b
       WHERE b.publicado AND b.ficha_publica
         AND ($1::text = '' OR strpos(lower(b.titulo || ' ' || b.descripcion), lower($1)) > 0)
         AND ($2::uuid IS NULL OR b.id > $2::uuid)
       ORDER BY b.id LIMIT $3`,
      [query.q ?? '', query.cursor ?? null, query.limit + 1],
    );
    const items = result.rows.slice(0, query.limit);
    return {
      items,
      nextCursor:
        result.rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async detail(id: string): Promise<PublicLibraryDetail> {
    const result = await this.database.query<
      PublicLibraryDetail & Record<string, unknown>
    >(
      `SELECT ${libraryFields},
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'title', s.titulo, 'pageStart', s.pagina_inicio, 'pageEnd', s.pagina_fin
       ) ORDER BY s.orden) FROM lms.biblioteca_secciones s WHERE s.item_id = b.id), '[]'::jsonb) AS sections
       FROM lms.biblioteca_items b WHERE b.id = $1::uuid AND b.publicado AND b.ficha_publica`,
      [id],
    );
    const item = result.rows[0];
    if (!item)
      throw new NotFoundException({
        code: 'LIBRARY_ITEM_NOT_FOUND',
        message: 'La ficha no está disponible.',
      });
    return item;
  }
}
