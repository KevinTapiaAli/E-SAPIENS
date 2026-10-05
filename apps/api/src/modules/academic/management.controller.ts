import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { UserManagementService } from '../identity/user-management.service';
import {
  CreateManagedUserDto,
  ManagedUserStateDto,
  TeacherProfileReviewDto,
} from '../identity/user-management.dto';
import { CourseManagementService } from './course-management.service';
import {
  CourseEditorDto,
  ModuleEditorDto,
  LessonEditorDto,
  EnrollmentStateDto,
} from './management.dto';

@ApiTags('Administration')
@ApiCookieAuth()
@Controller('academic/management')
export class ManagementController {
  constructor(
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
    private readonly courses: CourseManagementService,
    private readonly people: UserManagementService,
  ) {}
  private user(request: Request, write = false) {
    if (write) this.security.checkOrigin(request);
    return this.identity.authenticate(this.security.token(request));
  }

  @Post('users')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Crear cuenta aprobada con rol permitido y auditoría',
  })
  async createUser(@Req() req: Request, @Body() dto: CreateManagedUserDto) {
    return this.people.create(await this.user(req, true), dto);
  }
  @Post('teachers/:id/review')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async reviewTeacher(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TeacherProfileReviewDto,
  ) {
    return this.people.reviewTeacher(await this.user(req, true), id, dto);
  }
  @Post('users/:id/state')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Suspender o aprobar cuenta; proteger administradores y sesión propia',
  })
  async userState(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManagedUserStateDto,
  ) {
    return this.people.state(await this.user(req, true), id, dto);
  }
  @Get('courses/:id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Metadatos y estructura del curso para edición administrativa',
  })
  async read(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.read(await this.user(req), id);
  }
  @Get('courses/:id/lessons/:lessonId')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Cargar solo el contenido de la lección que se edita',
  })
  async readLesson(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.courses.readLesson(await this.user(req), id, lessonId);
  }
  @Post('courses')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Crear materia en borrador y sus reglas académicas',
  })
  async create(@Req() req: Request, @Body() dto: CourseEditorDto) {
    return this.courses.create(await this.user(req, true), dto);
  }
  @Post('courses/:id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Guardar datos y publicación con control de revisión',
  })
  async save(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CourseEditorDto,
  ) {
    return this.courses.save(await this.user(req, true), id, dto);
  }
  @Post('courses/:id/modules')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Añadir módulo al temario no utilizado' })
  async createModule(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModuleEditorDto,
  ) {
    return this.courses.module(await this.user(req, true), id, null, dto);
  }
  @Post('courses/:id/modules/:moduleId')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Guardar módulo con control de revisión y orden' })
  async saveModule(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: ModuleEditorDto,
  ) {
    return this.courses.module(await this.user(req, true), id, moduleId, dto);
  }
  @Post('courses/:id/modules/:moduleId/lessons')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Añadir lección al temario no utilizado' })
  async createLesson(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: LessonEditorDto,
  ) {
    return this.courses.lesson(
      await this.user(req, true),
      id,
      moduleId,
      null,
      dto,
    );
  }
  @Post('courses/:id/modules/:moduleId/lessons/:lessonId')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Editar y publicar texto de una lección autorizada',
  })
  async saveLesson(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: LessonEditorDto,
  ) {
    return this.courses.lesson(
      await this.user(req, true),
      id,
      moduleId,
      lessonId,
      dto,
    );
  }
  @Post('enrollments/:id/state')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Suspender, reactivar o cancelar matrícula con motivo',
  })
  async enrollmentState(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnrollmentStateDto,
  ) {
    return this.courses.enrollmentState(await this.user(req, true), id, dto);
  }
}
