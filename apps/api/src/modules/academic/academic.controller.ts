import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { AcademicService } from './academic.service';
import {
  AcademicCoursesQuery,
  AcademicListQuery,
  AcademicOperationDto,
  AcademicPeopleQuery,
  AcademicRole,
} from './academic.dto';

@ApiTags('Academic portal')
@ApiCookieAuth()
@Controller('academic')
export class AcademicController {
  constructor(
    private readonly academic: AcademicService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}
  private user(request: Request) {
    return this.identity.authenticate(this.security.token(request));
  }

  @Get('overview/:role')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Indicadores reales del portal según rol y propiedad',
  })
  async overview(
    @Param('role', new ParseEnumPipe(AcademicRole)) role: AcademicRole,
    @Req() request: Request,
  ) {
    return this.academic.overview(await this.user(request), role);
  }

  @Get('courses')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Cursos del ámbito autorizado con progreso propio o matrícula agregada',
  })
  async courses(@Query() query: AcademicCoursesQuery, @Req() request: Request) {
    return this.academic.courses(await this.user(request), query);
  }

  @Get('people')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Administración: consulta paginada de cuentas por perfil y estado',
  })
  async people(@Query() query: AcademicPeopleQuery, @Req() request: Request) {
    return this.academic.people(await this.user(request), query);
  }

  @Get('enrollments')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Administración: registro paginado de matrículas' })
  async enrollments(
    @Query() query: AcademicListQuery,
    @Req() request: Request,
  ) {
    return this.academic.enrollments(await this.user(request), query);
  }

  @Post('enrollments')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Matricular estudiante aprobado en curso publicado, sin conceder acceso privado',
  })
  async enroll(@Body() dto: AcademicOperationDto, @Req() request: Request) {
    this.security.checkOrigin(request);
    return this.academic.registerOperation(
      await this.user(request),
      dto,
      'enroll',
    );
  }

  @Post('assignments')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Asignar docente aprobado a curso no archivado con motivo y auditoría',
  })
  async assign(@Body() dto: AcademicOperationDto, @Req() request: Request) {
    this.security.checkOrigin(request);
    return this.academic.registerOperation(
      await this.user(request),
      dto,
      'assign',
    );
  }
}
