import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PublicListQueryDto } from '../../common/http/dto/public-list-query.dto';
import { LibraryService } from './library.service';
import { libraryDetailSchema, libraryPageSchema } from './library.openapi';

@ApiTags('Biblioteca pública')
@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar fichas publicadas y públicas; búsqueda literal y paginación por UUID',
  })
  @ApiOkResponse({ schema: libraryPageSchema })
  list(@Query() query: PublicListQueryDto) {
    return this.library.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar bibliografía y temas; no entrega archivos',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: libraryDetailSchema })
  @ApiNotFoundResponse({
    description: 'Ficha inexistente, privada o no publicada',
  })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.library.detail(id);
  }
}
