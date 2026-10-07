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
import {
  IsBoolean,
  IsIn,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import type { Request } from 'express';
import type { PersonalAgenda, WorkspaceRole } from '@esapiens/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';

class AgendaRoleQuery {
  @IsIn(['administrador', 'docente', 'estudiante'])
  role: WorkspaceRole = 'administrador';
}
class AgendaQuery extends AgendaRoleQuery {
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
    const user = await this.user(request, query.role);
    this.day(query.day);
    if (!query.day.startsWith(query.month))
      throw new BadRequestException({
        code: 'INVALID_CALENDAR_MONTH',
        message: 'La fecha debe pertenecer al mes consultado.',
      });
    const result = await this.db.query<PersonalAgenda>(
      `WITH bounds AS (
        SELECT ($2||'-01')::date AS month_start,
          (($2||'-01')::date+interval '1 month')::date AS month_end,
          (now() AT TIME ZONE $4)::date AS today,
          (now() AT TIME ZONE $4)::date+30 AS upcoming_end
      ), courses AS (
        SELECT c.id,c.titulo FROM lms.cursos c WHERE
          $5::text='administrador'
          OR ($5='docente' AND EXISTS (
            SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=c.id AND d.docente_id=$1
          ))
          OR ($5='estudiante' AND c.estado='publicado' AND EXISTS (
            SELECT 1 FROM lms.inscripciones i WHERE i.curso_id=c.id AND i.estudiante_id=$1 AND i.estado='activa'
          ))
      ), events AS (
      SELECT a.id,a.titulo AS title,to_char(a.fecha,'YYYY-MM-DD') AS day,'recordatorio'::text AS kind,a.completado AS done,null::uuid AS "courseId",null::text AS course,null::timestamptz AS "occursAt"
      FROM lms.agenda_personal a CROSS JOIN bounds b WHERE a.usuario_id=$1 AND (
        (a.fecha>=b.month_start AND a.fecha<b.month_end) OR (a.fecha>=b.today AND a.fecha<b.upcoming_end)
      )
      UNION ALL
      SELECT t.id,t.titulo,to_char(t.fecha_limite AT TIME ZONE $4,'YYYY-MM-DD'),'tarea',
        ($5='estudiante' AND EXISTS (
          SELECT 1 FROM lms.entregas_tarea e JOIN lms.inscripciones i ON i.id=e.inscripcion_id
          WHERE e.tarea_id=t.id AND i.estudiante_id=$1
        )),t.curso_id,c.titulo,t.fecha_limite
      FROM lms.tareas t JOIN courses c ON c.id=t.curso_id CROSS JOIN bounds b
      WHERE t.publicada AND ($5<>'estudiante' OR lms.puede_acceder_modulo($1,t.modulo_id)) AND (
        (t.fecha_limite>=(b.month_start::timestamp AT TIME ZONE $4) AND t.fecha_limite<(b.month_end::timestamp AT TIME ZONE $4))
        OR (t.fecha_limite>=now() AND t.fecha_limite<(b.upcoming_end::timestamp AT TIME ZONE $4))
      )
      UNION ALL
      SELECT sc.id,sc.titulo,to_char(sc.inicia_en AT TIME ZONE $4,'YYYY-MM-DD'),'clase',sc.estado='finalizada',sc.curso_id,c.titulo,sc.inicia_en
      FROM lms.sesiones_clase sc JOIN courses c ON c.id=sc.curso_id CROSS JOIN bounds b
      WHERE sc.estado<>'cancelada' AND ($5<>'estudiante' OR lms.puede_acceder_modulo($1,sc.modulo_id))
        AND sc.inicia_en>=(b.month_start::timestamp AT TIME ZONE $4) AND sc.inicia_en<(b.month_end::timestamp AT TIME ZONE $4)
    ), counts AS (
      SELECT day,count(*)::int AS count FROM events WHERE left(day,7)=$2 GROUP BY day
    ), selected AS (
      SELECT * FROM events WHERE day=$3 ORDER BY "occursAt" NULLS FIRST,kind,lower(title),id LIMIT 100
    ), upcoming AS (
      SELECT e.* FROM events e CROSS JOIN bounds b
      WHERE e.kind IN ('tarea','recordatorio') AND NOT e.done
        AND e.day>=to_char(b.today,'YYYY-MM-DD') AND e.day<to_char(b.upcoming_end,'YYYY-MM-DD')
        AND (e."occursAt" IS NULL OR e."occursAt">=now())
      ORDER BY e.day,e."occursAt" NULLS FIRST,e.kind,lower(e.title),e.id LIMIT 8
    )
    SELECT coalesce((SELECT jsonb_agg(counts ORDER BY day) FROM counts),'[]') AS days,
      coalesce((SELECT jsonb_agg(selected ORDER BY "occursAt" NULLS FIRST,kind,lower(title),id) FROM selected),'[]') AS events,
      coalesce((SELECT jsonb_agg(upcoming ORDER BY day,"occursAt" NULLS FIRST,kind,lower(title),id) FROM upcoming),'[]') AS upcoming,
      (SELECT count(*)::int FROM events WHERE day=$3) AS total`,
      [user.id, query.month, query.day, user.timeZone, query.role],
    );
    return result.rows[0];
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(
    @Body() dto: ReminderDto,
    @Query() query: AgendaRoleQuery,
    @Req() request: Request,
  ) {
    const user = await this.user(request, query.role, true);
    this.day(dto.day);
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
