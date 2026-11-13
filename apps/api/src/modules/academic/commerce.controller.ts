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
import { AcademicListQuery } from './academic.dto';
import { CommerceService } from './commerce.service';
import { AcademicWriteLimiter } from './academic-write-limiter';
import {
  CreateOrderDto,
  CreatePlanDto,
  ReportPaymentDto,
  ReviewPaymentDto,
} from './commerce.dto';

@ApiTags('Marketplace y pagos manuales')
@ApiCookieAuth()
@Controller('academic/commerce')
export class CommerceController {
  constructor(
    private readonly service: CommerceService,
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
  @Get('plans')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Planes publicados e instrucciones institucionales de pago',
  })
  async plans(@Req() r: Request, @Query() q: AcademicListQuery) {
    return this.service.plans(await this.user(r), q);
  }
  @Post('plans')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Administrador: publicar precio y cobertura de una materia',
  })
  async plan(@Req() r: Request, @Body() dto: CreatePlanDto) {
    return this.service.createPlan(await this.user(r, true), dto);
  }
  @Get('orders')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Estudiante: consultar exclusivamente sus compras' })
  async orders(@Req() r: Request, @Query() q: AcademicListQuery) {
    return this.service.orders(await this.user(r), q);
  }
  @Post('orders')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Crear una orden idempotente con precio calculado por el servidor',
  })
  async order(@Req() r: Request, @Body() dto: CreateOrderDto) {
    return this.service.order(await this.user(r, true), dto);
  }
  @Post('orders/:id/payment')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Registrar referencia bancaria; no habilita acceso automáticamente',
  })
  async report(
    @Req() r: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportPaymentDto,
  ) {
    return this.service.report(await this.user(r, true), id, dto);
  }
  @Get('pending')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Administrador: bandeja paginada de pagos pendientes',
  })
  async pending(@Req() r: Request, @Query() q: AcademicListQuery) {
    return this.service.pending(await this.user(r), q);
  }
  @Post('payments/:id/review')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Verificar el extracto bancario antes de confirmar; decisión auditada',
  })
  async review(
    @Req() r: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.service.review(await this.user(r, true), id, dto);
  }
}
