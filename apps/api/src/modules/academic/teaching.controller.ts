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
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { TeachingService } from './teaching.service';
import {
  MaterialDto,
  GradeSubmissionDto,
  SubmitTaskDto,
  TaskDto,
  TaskFeedbackDto,
  TeachingQuery,
} from './teaching.dto';

@ApiTags('Teaching workspace')
@ApiCookieAuth()
@Controller('academic/teaching/:courseId')
export class TeachingController {
  constructor(
    private readonly teaching: TeachingService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}
  private user(req: Request, write = false) {
    if (write) this.security.checkOrigin(req);
    return this.identity.authenticate(this.security.token(req));
  }
  @Get()
  @Header('Cache-Control', 'no-store')
  async course(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() q: TeachingQuery,
  ) {
    return this.teaching.course(await this.user(req), courseId, q.role);
  }
  @Get('materials')
  @Header('Cache-Control', 'no-store')
  async materials(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() q: TeachingQuery,
  ) {
    return this.teaching.materials(await this.user(req), courseId, q);
  }
  @Post('materials')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async createMaterial(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: MaterialDto,
  ) {
    return this.teaching.saveMaterial(
      await this.user(req, true),
      courseId,
      null,
      dto,
    );
  }
  @Post('materials/:id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async material(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MaterialDto,
  ) {
    return this.teaching.saveMaterial(
      await this.user(req, true),
      courseId,
      id,
      dto,
    );
  }
  @Get('tasks')
  @Header('Cache-Control', 'no-store')
  async tasks(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() q: TeachingQuery,
  ) {
    return this.teaching.tasks(await this.user(req), courseId, q);
  }
  @Get('tasks/:id')
  @Header('Cache-Control', 'no-store')
  async task(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: TeachingQuery,
  ) {
    return this.teaching.task(await this.user(req), courseId, id, q.role);
  }
  @Post('tasks')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async createTask(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: TaskDto,
  ) {
    return this.teaching.saveTask(
      await this.user(req, true),
      courseId,
      null,
      dto,
    );
  }
  @Post('tasks/:id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async saveTask(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TaskDto,
  ) {
    return this.teaching.saveTask(
      await this.user(req, true),
      courseId,
      id,
      dto,
    );
  }
  @Get('tasks/:id/submissions')
  @Header('Cache-Control', 'no-store')
  async submissions(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: TeachingQuery,
  ) {
    return this.teaching.submissions(await this.user(req), courseId, id, q);
  }
  @Post('tasks/:id/submissions')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async submit(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitTaskDto,
  ) {
    return this.teaching.submit(await this.user(req, true), courseId, id, dto);
  }
  @Post('tasks/:id/submissions/:submissionId/grade')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async grade(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.teaching.grade(
      await this.user(req, true),
      courseId,
      id,
      submissionId,
      dto,
    );
  }

  @Post('tasks/:id/submissions/:submissionId/feedback')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async feedback(
    @Req() req: Request,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: TaskFeedbackDto,
  ) {
    return this.teaching.feedback(
      await this.user(req, true),
      courseId,
      id,
      submissionId,
      dto,
    );
  }
}
