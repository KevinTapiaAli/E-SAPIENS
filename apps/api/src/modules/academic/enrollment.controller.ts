import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
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
import { AcademicListQuery } from './academic.dto';
import { EnrollmentService } from './enrollment.service';
import { ClassroomService } from './classroom.service';
import {
  EnrollmentReasonDto,
  GrantAccessDto,
  RequestEnrollmentDto,
  ReviewEnrollmentDto,
  EnrollmentRequestsQuery,
} from './enrollment.dto';

@ApiTags('Enrollment and classroom')
@ApiCookieAuth()
@Controller('academic')
export class EnrollmentController {
  constructor(
    private readonly enrollment: EnrollmentService,
    private readonly classroom: ClassroomService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}
  private user(request: Request, write = false) {
    if (write) this.security.checkOrigin(request);
    return this.identity.authenticate(this.security.token(request));
  }

  @Get('offerings')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Materias publicadas y estado de inscripción del estudiante',
  })
  async offerings(@Req() request: Request, @Query() query: AcademicListQuery) {
    return this.enrollment.offerings(await this.user(request), query);
  }

  @Get('registration-requests')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Solicitudes de inscripción: docente asignado o consulta administrativa',
  })
  async requests(
    @Req() request: Request,
    @Query() query: EnrollmentRequestsQuery,
  ) {
    return this.enrollment.requests(await this.user(request), query);
  }

  @Post('registration-requests')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Solicitar inscripción propia; no concede acceso automáticamente',
  })
  async request(@Req() request: Request, @Body() dto: RequestEnrollmentDto) {
    return this.enrollment.request(
      await this.user(request, true),
      dto.courseId,
    );
  }

  @Post('registration-requests/:id/review')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Aprobar con matrícula o rechazar una solicitud, con auditoría',
  })
  async review(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewEnrollmentDto,
  ) {
    return this.enrollment.review(await this.user(request, true), id, dto);
  }

  @Get('enrollments/:id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Administración: matrícula, módulos y autorizaciones paginadas',
  })
  async access(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AcademicListQuery,
  ) {
    return this.enrollment.access(await this.user(request), id, query);
  }

  @Post('enrollments/:id/access')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Autorizar módulos por días desde ahora, con clave de idempotencia y motivo',
  })
  async grant(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantAccessDto,
  ) {
    return this.enrollment.grant(await this.user(request, true), id, dto);
  }

  @Post('enrollments/:id/access/:grantId/revoke')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Revocar una autorización institucional, conservando su historial',
  })
  async revoke(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Body() dto: EnrollmentReasonDto,
  ) {
    return this.enrollment.revoke(
      await this.user(request, true),
      id,
      grantId,
      dto,
    );
  }

  @Get('classroom/:courseId')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Aula propia: temario, avance y explicación de acceso por módulo',
  })
  async course(
    @Req() request: Request,
    @Param('courseId', ParseUUIDPipe) id: string,
  ) {
    return this.classroom.course(await this.user(request), id);
  }

  @Get('classroom/:courseId/lessons/:lessonId')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Contenido de lección con autorización efectiva en PostgreSQL',
  })
  async lesson(
    @Req() request: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.classroom.lesson(await this.user(request), courseId, lessonId);
  }

  @Post('classroom/:courseId/lessons/:lessonId/complete')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Registrar avance propio declarado, sin asignar notas ni simular reproducción',
  })
  async complete(
    @Req() request: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.classroom.complete(
      await this.user(request, true),
      courseId,
      lessonId,
    );
  }
}
