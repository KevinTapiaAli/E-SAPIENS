import {
  BadRequestException,
  Body,
  ConflictException,
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
import { IsBoolean, IsString, IsUUID, Length, Matches } from 'class-validator';
import type { Request } from 'express';
import type { PersonalAgenda } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';

class AgendaQuery {
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/) month: string;
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/) day: string;
}
class ReminderDto {
  @IsUUID() operationId: string;
  @IsString() @Length(3, 180) title: string;
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/) day: string;
}
class ReminderStateDto {
  @IsBoolean() done: boolean;
}

@Controller('academic/agenda')
export class AgendaController {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}
  private async user(request: Request, write = false) {
    if (write) this.security.checkOrigin(request);
    const user = await this.identity.authenticate(this.security.token(request));
    this.identity.authorize(user, 'administrador', 'academic.read');
    return user;
  }
  private day(value: string) {
    const parsed = new Date(`${value}T12:00:00Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException({
        code: 'INVALID_CALENDAR_DATE',
        message: 'Elige una fecha válida.',
      });
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Query() query: AgendaQuery, @Req() request: Request) {
    const user = await this.user(request);
    this.day(query.day);
    if (!query.day.startsWith(query.month))
      throw new BadRequestException({
        code: 'INVALID_CALENDAR_MONTH',
        message: 'La fecha debe pertenecer al mes consultado.',
      });
    const result = await this.db.query<PersonalAgenda>(
      `WITH events AS (
      SELECT a.id,a.titulo AS title,to_char(a.fecha,'YYYY-MM-DD') AS day,'recordatorio'::text AS kind,a.completado AS done,null::uuid AS "courseId",null::text AS course
      FROM lms.agenda_personal a WHERE a.usuario_id=$1 AND a.fecha>=($2||'-01')::date AND a.fecha<($2||'-01')::date+interval '1 month'
      UNION ALL
      SELECT t.id,t.titulo,to_char(t.fecha_limite AT TIME ZONE $4,'YYYY-MM-DD'),'tarea',false,t.curso_id,c.titulo
      FROM lms.tareas t JOIN lms.cursos c ON c.id=t.curso_id WHERE t.publicada AND t.fecha_limite>=((($2||'-01')::date)::timestamp AT TIME ZONE $4) AND t.fecha_limite<((($2||'-01')::date+interval '1 month') AT TIME ZONE $4)
      UNION ALL
      SELECT sc.id,sc.titulo,to_char(sc.inicia_en AT TIME ZONE $4,'YYYY-MM-DD'),'clase',false,sc.curso_id,c.titulo
      FROM lms.sesiones_clase sc JOIN lms.cursos c ON c.id=sc.curso_id WHERE sc.estado<>'cancelada' AND sc.inicia_en>=((($2||'-01')::date)::timestamp AT TIME ZONE $4) AND sc.inicia_en<((($2||'-01')::date+interval '1 month') AT TIME ZONE $4)
    ), counts AS (SELECT day,count(*)::int AS count FROM events GROUP BY day), selected AS (SELECT * FROM events WHERE day=$3 ORDER BY kind,lower(title),id LIMIT 100)
    SELECT coalesce((SELECT jsonb_agg(counts ORDER BY day) FROM counts),'[]') AS days,
      coalesce((SELECT jsonb_agg(selected ORDER BY kind,lower(title),id) FROM selected),'[]') AS events,
      (SELECT count(*)::int FROM events WHERE day=$3) AS total`,
      [user.id, query.month, query.day, user.timeZone],
    );
    return result.rows[0];
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Body() dto: ReminderDto, @Req() request: Request) {
    const user = await this.user(request, true);
    this.day(dto.day);
    const result = await this.db.query(
      `INSERT INTO lms.agenda_personal(id,usuario_id,titulo,fecha) VALUES($1,$2,$3,$4::date) ON CONFLICT(id) DO NOTHING RETURNING id`,
      [dto.operationId, user.id, dto.title, dto.day],
    );
    if (!result.rowCount) {
      const existing = await this.db.query(
        'SELECT id FROM lms.agenda_personal WHERE id=$1 AND usuario_id=$2 AND titulo=$3 AND fecha=$4::date',
        [dto.operationId, user.id, dto.title, dto.day],
      );
      if (!existing.rowCount)
        throw new ConflictException({
          code: 'REMINDER_CONFLICT',
          message: 'Este recordatorio ya se guardó con otros datos.',
        });
    }
    return { message: 'Recordatorio guardado en tu agenda personal.' };
  }
  @Post(':id')
  @Header('Cache-Control', 'no-store')
  async state(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReminderStateDto,
    @Req() request: Request,
  ) {
    const user = await this.user(request, true);
    const r = await this.db.query(
      'UPDATE lms.agenda_personal SET completado=$3 WHERE id=$1 AND usuario_id=$2 RETURNING id',
      [id, user.id, dto.done],
    );
    if (!r.rowCount)
      throw new NotFoundException({
        code: 'REMINDER_NOT_FOUND',
        message: 'Recordatorio no disponible.',
      });
    return {
      message: dto.done
        ? 'Recordatorio completado.'
        : 'Recordatorio reabierto.',
    };
  }
}
