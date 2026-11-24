import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import type { WorkspaceRole } from '@esapiens/contracts';

export class AgendaRoleQuery {
  @ApiProperty({
    enum: ['administrador', 'docente', 'estudiante'],
    default: 'administrador',
  })
  @IsIn(['administrador', 'docente', 'estudiante'])
  role: WorkspaceRole = 'administrador';
}
export class AgendaQuery extends AgendaRoleQuery {
  @ApiProperty({ example: '2026-11' })
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/)
  month: string;
  @ApiProperty({
    example: '2026-11-23',
    description: 'Fecha real dentro del mes consultado.',
  })
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  day: string;
  @ApiPropertyOptional({
    enum: ['month', 'week', 'upcoming'],
    description:
      'Opta por eventos del período y evaluaciones. Sin view se conserva el contrato anterior.',
  })
  @IsOptional()
  @IsIn(['month', 'week', 'upcoming'])
  view?: 'month' | 'week' | 'upcoming';
  @ApiPropertyOptional({
    enum: ['todos', 'clase', 'tarea', 'evaluacion', 'recordatorio', 'feriado'],
    default: 'todos',
  })
  @IsIn(['todos', 'clase', 'tarea', 'evaluacion', 'recordatorio', 'feriado'])
  type: string = 'todos';
}
export class AgendaHolidaysQuery extends AgendaRoleQuery {
  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2099 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2099)
  year: number;
}
