import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DataCenterIndicator } from '@esapiens/contracts';

export class DataCenterQuery {
  @ApiPropertyOptional({ enum: ['7', '30', '90'], default: '30' })
  @IsIn(['7', '30', '90'])
  days = '30';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    enum: ['todos', 'activa', 'suspendida', 'abandonada', 'cancelada'],
    default: 'todos',
  })
  @IsIn(['todos', 'activa', 'suspendida', 'abandonada', 'cancelada'])
  state = 'todos';

  @ApiPropertyOptional({
    enum: ['todos', 'publicado', 'borrador', 'revision', 'archivado'],
    default: 'todos',
  })
  @IsIn(['todos', 'publicado', 'borrador', 'revision', 'archivado'])
  courseState = 'todos';

  @ApiPropertyOptional({
    enum: ['todos', 'pendiente', 'aprobada', 'rechazada'],
    default: 'todos',
  })
  @IsIn(['todos', 'pendiente', 'aprobada', 'rechazada'])
  requestState = 'todos';

  @ApiPropertyOptional({
    enum: [
      'todos',
      'sin_iniciar',
      'en_curso',
      'completado',
      'sin_contenido',
      'sin_actividad',
      'sin_cobertura',
    ],
    default: 'todos',
  })
  @IsIn([
    'todos',
    'sin_iniciar',
    'en_curso',
    'completado',
    'sin_contenido',
    'sin_actividad',
    'sin_cobertura',
  ])
  stage = 'todos';

  @ApiPropertyOptional({
    enum: ['students', 'courses', 'teachers', 'requests', 'traffic'],
    default: 'students',
  })
  @IsIn(['students', 'courses', 'teachers', 'requests', 'traffic'])
  indicator: DataCenterIndicator = 'students';

  @ApiPropertyOptional({ minimum: 1, maximum: 10000, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({
    enum: ['name', 'progress', 'students', 'pending', 'activity'],
    default: 'name',
  })
  @IsIn(['name', 'progress', 'students', 'pending', 'activity'])
  sort = 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsIn(['asc', 'desc'])
  direction = 'asc';
}
