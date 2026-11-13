import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import type { Request } from 'express';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { AcademicListQuery } from './academic.dto';
import { AcademicWriteLimiter } from './academic-write-limiter';
class SaveLibraryDto {
  @ApiProperty({
    example: true,
    description:
      'Guardar o retirar de la lista personal; no modifica el material',
  })
  @IsBoolean()
  saved: boolean;
}
@ApiTags('Biblioteca personal')
@ApiCookieAuth()
@Controller('academic/saved-library')
export class SavedLibraryController {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
    private readonly limiter: AcademicWriteLimiter,
  ) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() req: Request, @Query() q: AcademicListQuery) {
    const user = await this.identity.authenticate(this.security.token(req));
    const r = await this.db.query(
      `SELECT b.id,b.titulo AS title,b.descripcion AS description FROM lms.biblioteca_guardados s
      JOIN lms.biblioteca_items b ON b.id=s.item_id WHERE s.usuario_id=$1 AND b.publicado AND b.ficha_publica
      AND ($2::uuid IS NULL OR b.id>$2) ORDER BY b.id LIMIT $3`,
      [user.id, q.cursor ?? null, q.limit + 1],
    );
    return {
      items: r.rows.slice(0, q.limit),
      nextCursor: r.rows.length > q.limit ? r.rows[q.limit - 1].id : null,
    };
  }
  @Post(':id')
  @Header('Cache-Control', 'no-store')
  async save(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveLibraryDto,
  ) {
    this.security.checkOrigin(req);
    const user = await this.identity.authenticate(this.security.token(req));
    await this.limiter.check(user.id);
    if (!dto.saved) {
      await this.db.query(
        'DELETE FROM lms.biblioteca_guardados WHERE usuario_id=$1 AND item_id=$2',
        [user.id, id],
      );
    } else {
      await this.db.transaction(async (c) => {
        const visible = await c.query(
          'SELECT id FROM lms.biblioteca_items WHERE id=$1 AND publicado AND ficha_publica FOR SHARE',
          [id],
        );
        if (!visible.rowCount)
          throw new NotFoundException('La ficha no está disponible.');
        await c.query(
          'INSERT INTO lms.biblioteca_guardados(usuario_id,item_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [user.id, id],
        );
      });
    }
    return {
      message: dto.saved
        ? 'Referencia guardada en Mi biblioteca.'
        : 'Referencia retirada de tu lista.',
    };
  }
}
