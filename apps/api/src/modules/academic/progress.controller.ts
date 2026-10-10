import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { ProgressService } from './progress.service';
import { ProgressQuery, ProgressRoleQuery, ReportQuery } from './progress.dto';

@Controller('academic/progress')
@ApiTags('Academic progress')
@ApiCookieAuth()
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Avance por matrícula; docentes limitados a sus materias asignadas',
  })
  async list(@Query() query: ProgressQuery, @Req() request: Request) {
    return this.progress.list(
      await this.identity.authenticate(this.security.token(request)),
      query,
    );
  }

  @Get('report')
  @Header('Cache-Control', 'no-store')
  async report(@Query() query: ReportQuery, @Req() request: Request) {
    return this.progress.report(
      await this.identity.authenticate(this.security.token(request)),
      query,
    );
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Avance y disponibilidad de cada módulo para una matrícula autorizada',
  })
  async detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ProgressRoleQuery,
    @Req() request: Request,
  ) {
    return this.progress.detail(
      await this.identity.authenticate(this.security.token(request)),
      query.role,
      id,
    );
  }
}
