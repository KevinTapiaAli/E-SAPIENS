import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PublicListQueryDto {
  @ApiPropertyOptional({
    description: 'Texto a buscar en título y descripción',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 24, default: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit: number = 12;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'nextCursor de la respuesta anterior; mantener la misma búsqueda',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
