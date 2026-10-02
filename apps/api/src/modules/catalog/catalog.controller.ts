import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PublicListQueryDto } from '../../common/http/dto/public-list-query.dto';
import { CatalogService } from './catalog.service';
import { courseDetailSchema, coursePageSchema } from './catalog.openapi';

class CourseSlugDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  slug!: string;
}

@ApiTags('Catálogo público')
@Controller('courses')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar cursos publicados; búsqueda literal y paginación por UUID',
  })
  @ApiOkResponse({ schema: coursePageSchema })
  list(@Query() query: PublicListQueryDto) {
    return this.catalog.list(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Consultar ficha y temario público de un curso' })
  @ApiOkResponse({ schema: courseDetailSchema })
  @ApiNotFoundResponse({ description: 'Curso inexistente o no publicado' })
  detail(@Param() params: CourseSlugDto) {
    return this.catalog.detail(params.slug);
  }
}
