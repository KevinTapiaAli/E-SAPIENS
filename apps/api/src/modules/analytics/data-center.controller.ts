import { Controller, Get, Header, Query, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { DataCenterService } from './data-center.service';
import { DataCenterQuery } from './data-center.dto';
import { dataCenterSchema } from './data-center.openapi';

@ApiTags('Centro de Datos')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Se requiere una sesión aprobada.' })
@ApiForbiddenResponse({
  description:
    'Requiere rol administrador o administrador general y ambos permisos dashboard.admin y academic.read.',
})
@ApiBadRequestResponse({
  description: 'Filtros no válidos o parámetros desconocidos.',
})
@ApiServiceUnavailableResponse({
  description:
    'Servicio de analítica no disponible; no se ejecutan consultas alternativas.',
})
@Controller('analytics/data-center')
export class DataCenterController {
  constructor(
    private readonly data: DataCenterService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}

  private async authorize(request: Request) {
    const user = await this.identity.authenticate(this.security.token(request));
    this.identity.authorize(user, 'administrador', 'dashboard.admin');
    this.identity.authorize(user, 'administrador', 'academic.read');
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Consultar Centro de Datos administrativo',
    description:
      'Estado académico actual y actividad en 7/30/90 días UTC completos. Paginación real, orden estable y columnas explícitas sin datos de sesión ni hashes. Cuentas aprobadas no equivalen a actividad reciente. Los filtros académicos se aplican a matrículas, cursos y docentes; el tráfico se filtra por curso y período.',
  })
  @ApiOkResponse({ schema: dataCenterSchema })
  async query(@Query() query: DataCenterQuery, @Req() request: Request) {
    await this.authorize(request);
    return this.data.query(query);
  }

  @Get('export.csv')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'Exportar resultados autorizados como CSV',
    description:
      'Mismos filtros y orden que la consulta. Primeros 5000 registros de todas las páginas. Celdas protegidas frente a fórmulas; fechas ISO UTC. Cabeceras X-Export-Rows, X-Export-Total y X-Export-Truncated informan los límites.',
  })
  @ApiOkResponse({ schema: { type: 'string' } })
  async export(
    @Query() query: DataCenterQuery,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authorize(request);
    const result = await this.data.export(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.setHeader('X-Export-Rows', result.rows);
    response.setHeader('X-Export-Total', result.total);
    response.setHeader('X-Export-Truncated', String(result.truncated));
    return result.csv;
  }
}
