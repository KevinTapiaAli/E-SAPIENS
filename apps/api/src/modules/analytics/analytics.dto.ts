import { IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardQuery {
  @ApiPropertyOptional({
    enum: ['7', '30', '90'],
    default: '30',
    description: 'Días UTC completos anteriores a hoy.',
  })
  @IsIn(['7', '30', '90'])
  days = '30';
}

export class VisitDto {
  @ApiProperty({
    example: '/cursos',
    description:
      'Ruta visitada: inicio, cursos, biblioteca, registro, login u oferta. No es una URL externa.',
  })
  @Matches(
    /^\/(?:cursos(?:\/[a-z0-9-]{1,200})?|biblioteca(?:\/[a-f0-9-]{36})?|registro|login|oferta)?$/,
  )
  path: string;
}
