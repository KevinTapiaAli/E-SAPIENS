import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { AnalyticsService } from './analytics.service';
import { DashboardQuery, VisitDto } from './analytics.dto';
import { visitorDigest } from './visitor';

@ApiTags('Executive analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}

  @Get('dashboard')
  @ApiCookieAuth()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Panel ejecutivo administrativo con definiciones y periodos explícitos',
  })
  async dashboard(@Query() query: DashboardQuery, @Req() request: Request) {
    const user = await this.identity.authenticate(this.security.token(request));
    this.identity.authorize(user, 'administrador', 'dashboard.admin');
    this.identity.authorize(user, 'administrador', 'academic.read');
    return this.analytics.dashboard(Number(query.days));
  }

  @Post('visit')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Registrar una visita estimada; nunca una conversión del navegador',
  })
  async visit(@Body() dto: VisitDto, @Req() request: Request) {
    this.security.checkOrigin(request);
    const visitor = visitorDigest(request.headers['x-esapiens-visitor']);
    if (
      !visitor ||
      request.headers.dnt === '1' ||
      request.headers['sec-gpc'] === '1'
    )
      return;
    if (dto.path === '/oferta') {
      const user = await this.identity.authenticate(
        this.security.token(request),
      );
      this.identity.authorize(user, 'estudiante');
    }
    await this.analytics.visit(visitor, dto.path);
  }
}
