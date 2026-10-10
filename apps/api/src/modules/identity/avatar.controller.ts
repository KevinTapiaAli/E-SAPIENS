import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { IsString, MaxLength, ValidateIf } from 'class-validator';
import type { Request, Response } from 'express';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from './identity.service';
import { IdentitySecurityService } from './identity-security.service';

class AvatarDto {
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @MaxLength(46000)
  data: string | null;
}

function jpeg(data: string): Buffer {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  const invalid = () =>
    new BadRequestException({
      code: 'INVALID_AVATAR',
      message:
        'Selecciona una fotografía JPEG válida de hasta 256 × 256 píxeles.',
    });
  if (!match) throw invalid();
  const bytes = Buffer.from(match[1], 'base64');
  if (
    bytes.length < 4 ||
    bytes.length > 32768 ||
    bytes.readUInt16BE(0) !== 0xffd8 ||
    bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
  )
    throw invalid();
  let sizeFound = false;
  for (let offset = 2; offset + 4 <= bytes.length;) {
    if (bytes[offset] !== 0xff) throw invalid();
    const marker = bytes[offset + 1];
    if (marker === 0xda) {
      if (sizeFound) return bytes;
      throw invalid();
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > bytes.length) throw invalid();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) throw invalid();
      const height = bytes.readUInt16BE(offset + 5),
        width = bytes.readUInt16BE(offset + 7);
      if (!height || !width || height > 256 || width > 256) throw invalid();
      sizeFound = true;
    }
    offset += length + 2;
  }
  throw invalid();
}

@Controller('identity/avatar')
export class AvatarController {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}

  @Get()
  async image(@Req() request: Request, @Res() response: Response) {
    const user = await this.identity.authenticate(this.security.token(request));
    const result = await this.db.query<{ contenido: Buffer }>(
      'SELECT contenido FROM lms.fotos_perfil WHERE usuario_id=$1',
      [user.id],
    );
    if (!result.rows[0])
      throw new NotFoundException({
        code: 'AVATAR_NOT_FOUND',
        message: 'Aún no tienes fotografía.',
      });
    response
      .set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      })
      .send(result.rows[0].contenido);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async save(@Body() dto: AvatarDto, @Req() request: Request) {
    this.security.checkOrigin(request);
    const user = await this.identity.authenticate(this.security.token(request));
    if (dto.data === null)
      await this.db.query('DELETE FROM lms.fotos_perfil WHERE usuario_id=$1', [
        user.id,
      ]);
    else
      await this.db.query(
        `INSERT INTO lms.fotos_perfil(usuario_id,contenido) VALUES($1,$2)
      ON CONFLICT(usuario_id) DO UPDATE SET contenido=excluded.contenido,updated_at=clock_timestamp()`,
        [user.id, jpeg(dto.data)],
      );
    return {
      message:
        dto.data === null ? 'Fotografía eliminada.' : 'Fotografía actualizada.',
    };
  }
}
