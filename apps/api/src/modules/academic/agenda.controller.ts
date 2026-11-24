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
  Res,
} from '@nestjs/common';
import { IsBoolean, IsString, IsUUID, Length, Matches } from 'class-validator';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  AgendaQuery,
  AgendaRoleQuery,
  AgendaHolidaysQuery,
} from './agenda.dto';
import { AgendaService, agendaPeriod, calendarDay } from './agenda.service';
import { AgendaHolidaysService } from './agenda-holidays.service';
import { agendaIcal } from './agenda-ical';
import {
  ApiCookieAuth,
  ApiProperty,
  ApiTags,
  ApiProduces,
} from '@nestjs/swagger';
import type { WorkspaceRole } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';

class ReminderDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'UUID nuevo por operación; reutilizarlo solo al reintentar la misma creación.',
  })
  @IsUUID()
  operationId: string;
  @ApiProperty({
    minLength: 3,
    maxLength: 180,
    example: 'Preparar la próxima clase',
  })
  @IsString()
  @Length(3, 180)
  title: string;
  @ApiProperty({
    example: '2026-10-28',
    description: 'Fecha futura en la zona horaria del usuario.',
  })
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  day: string;
}
class ReminderStateDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  done: boolean;
}

@ApiTags('Personal agenda')
@ApiCookieAuth()
@Controller('academic/agenda')
export class AgendaController {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
    private readonly agenda: AgendaService,
    private readonly holidays: AgendaHolidaysService,
    private readonly config: ConfigService,
  ) {}
  private async user(request: Request, role: WorkspaceRole, write = false) {
    if (write) this.security.checkOrigin(request);
    const user = await this.identity.authenticate(this.security.token(request));
    this.identity.authorize(
      user,
      role,
      role === 'administrador'
        ? 'academic.read'
        : role === 'docente'
          ? 'teaching.manage'
          : 'classroom.study',
    );
    return user;
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Query() query: AgendaQuery, @Req() request: Request) {
    return this.agenda.list(await this.user(request, query.role), query);
  }
  @Get('holidays')
  @Header('Cache-Control', 'no-store')
  async publicHolidays(
    @Query() query: AgendaHolidaysQuery,
    @Req() request: Request,
  ) {
    await this.user(request, query.role);
    return this.holidays.forYear(query.year);
  }
  @Get('export.ics')
  @ApiProduces('text/calendar')
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async export(
    @Query() query: AgendaQuery,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.user(request, query.role);
    const enhanced = Object.assign(new AgendaQuery(), query, {
      view: query.view ?? 'month',
    });
    const period = agendaPeriod(enhanced, user.timeZone);
    const data = await this.agenda.list(user, enhanced, 10000);
    if (data.period!.total > 10000)
      throw new BadRequestException({
        code: 'AGENDA_EXPORT_LIMIT',
        message:
          'Hay demasiados eventos. Exporta una semana o aplica un filtro.',
      });
    const events = [...(data.periodEvents ?? [])];
    if (enhanced.type === 'todos' || enhanced.type === 'feriado') {
      const years = [
        ...new Set([
          Number(period.from.slice(0, 4)),
          Number(period.to.slice(0, 4)),
        ]),
      ];
      const holidays = await Promise.all(
        years.map((year) => this.holidays.forYear(year)),
      );
      if (holidays.every((h) => h.status === 'available'))
        events.push(
          ...holidays
            .flatMap((h) => h.events)
            .filter((e) => e.day >= period.from && e.day <= period.to),
        );
    }
    events.sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        (a.occursAt ?? '').localeCompare(b.occursAt ?? '') ||
        a.id.localeCompare(b.id),
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="esapiens-agenda-${period.from}-${period.to}.ics"`,
    );
    return agendaIcal(
      events,
      user.id,
      query.role,
      user.timeZone,
      this.config.getOrThrow<string>('APP_URL'),
    );
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(
    @Body() dto: ReminderDto,
    @Query() query: AgendaRoleQuery,
    @Req() request: Request,
  ) {
    const user = await this.user(request, query.role, true);
    calendarDay(dto.day);
    const title = dto.title.trim();
    if (title.length < 3)
      throw new BadRequestException({
        code: 'INVALID_REMINDER_TITLE',
        message: 'Escribe al menos tres caracteres para el recordatorio.',
      });
    const result = await this.db.query(
      `INSERT INTO lms.agenda_personal(id,usuario_id,titulo,fecha) VALUES($1,$2,$3,$4::date) ON CONFLICT(id) DO NOTHING RETURNING id`,
      [dto.operationId, user.id, title, dto.day],
    );
    if (!result.rowCount) {
      const existing = await this.db.query(
        'SELECT id FROM lms.agenda_personal WHERE id=$1 AND usuario_id=$2 AND titulo=$3 AND fecha=$4::date',
        [dto.operationId, user.id, title, dto.day],
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
    @Query() query: AgendaRoleQuery,
    @Req() request: Request,
  ) {
    const user = await this.user(request, query.role, true);
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
