import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { TeachingQuery } from './teaching.dto';
import { CreateEvaluationDto, SubmitEvaluationDto } from './evaluation.dto';
import { EvaluationService } from './evaluation.service';
import { AcademicWriteLimiter } from './academic-write-limiter';
@ApiTags('Evaluaciones')
@ApiCookieAuth()
@Controller('academic/evaluations/:courseId')
export class EvaluationController {
  constructor(
    private readonly service: EvaluationService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
    private readonly limiter: AcademicWriteLimiter,
  ) {}
  private async user(req: Request, write = false) {
    if (write) this.security.checkOrigin(req);
    const user = await this.identity.authenticate(this.security.token(req));
    if (write) await this.limiter.check(user.id);
    return user;
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Evaluaciones y resultados accesibles según rol y matrícula',
  })
  async list(
    @Req() r: Request,
    @Param('courseId', ParseUUIDPipe) course: string,
    @Query() q: TeachingQuery,
  ) {
    return this.service.list(await this.user(r), course, q);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Docente asignado: publicar evaluación de selección única',
  })
  async create(
    @Req() r: Request,
    @Param('courseId', ParseUUIDPipe) course: string,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.service.create(await this.user(r, true), course, dto);
  }
  @Get(':id/results')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Docente asignado o administrador: resultados individuales del grupo',
  })
  async results(
    @Req() r: Request,
    @Param('courseId', ParseUUIDPipe) course: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: TeachingQuery,
  ) {
    return this.service.results(await this.user(r), course, id, q);
  }
  @Post(':id/start')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Iniciar o recuperar intento propio; nunca devuelve respuestas correctas',
  })
  async start(
    @Req() r: Request,
    @Param('courseId', ParseUUIDPipe) course: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.start(await this.user(r, true), course, id);
  }
  @Post(':id/attempts/:attemptId')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Entregar intento propio y calcular nota en PostgreSQL',
  })
  async submit(
    @Req() r: Request,
    @Param('courseId', ParseUUIDPipe) course: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attemptId', ParseUUIDPipe) attempt: string,
    @Body() dto: SubmitEvaluationDto,
  ) {
    return this.service.submit(
      await this.user(r, true),
      course,
      id,
      attempt,
      dto,
    );
  }
}
