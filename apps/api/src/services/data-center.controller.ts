import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataCenterQuery } from '../modules/analytics/data-center.dto';
import { DataCenterService } from '../modules/analytics/data-center.service';
import { dataCenterSchema } from '../modules/analytics/data-center.openapi';

@ApiTags('Centro de Datos interno')
@Controller('analytics/data-center')
export class InternalDataCenterController {
  constructor(private readonly data: DataCenterService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Consultar indicadores administrativos internos',
    description:
      'Protegido por InternalServiceGuard. Los usuarios deben acceder mediante la API principal.',
  })
  @ApiOkResponse({ schema: dataCenterSchema })
  query(@Query() query: DataCenterQuery) {
    return this.data.query(query);
  }

  @Get('export')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Preparar CSV interno acotado',
    description: 'Máximo 5000 filas. La API principal autoriza la descarga.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        csv: { type: 'string' },
        rows: { type: 'integer' },
        total: { type: 'integer' },
        truncated: { type: 'boolean' },
      },
    },
  })
  export(@Query() query: DataCenterQuery) {
    return this.data.export(query);
  }
}
