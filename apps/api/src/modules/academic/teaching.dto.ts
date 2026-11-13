import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  ValidateIf,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { AcademicListQuery } from './academic.dto';
import type { WorkspaceRole } from '@esapiens/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeachingQuery extends AcademicListQuery {
  @ApiProperty({ enum: ['administrador', 'docente', 'estudiante'] })
  @IsIn(['administrador', 'docente', 'estudiante'])
  role: WorkspaceRole;
}
export class GradeSubmissionDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 85 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  grade: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 100,
    example: null,
    description:
      'Nota actual de la entrega; null si aún no fue calificada. Control de concurrencia.',
  })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  expectedGrade: number | null;
  @ApiProperty({
    minLength: 3,
    maxLength: 3000,
    example: 'Trabajo revisado según los criterios de la tarea.',
  })
  @IsString()
  @Length(3, 3000)
  reason: string;
}
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class MaterialDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID real de un módulo de la materia.',
  })
  @IsUUID()
  moduleId: string;
  @ApiProperty({ minLength: 3, maxLength: 180, example: 'Guía de estudio' })
  @Transform(trim)
  @IsString()
  @Length(3, 180)
  title: string;
  @ApiProperty({ enum: ['apoyo', 'contenido', 'referencia'], example: 'apoyo' })
  @IsIn(['apoyo', 'contenido', 'referencia'])
  kind: string;
  @ApiProperty({
    maxLength: 12000,
    example: 'Revisar las ideas principales de la lección.',
  })
  @Transform(trim)
  @IsString()
  @Length(0, 12000)
  content: string;
  @ApiProperty({
    maxLength: 2000,
    example: '',
    description: 'Enlace HTTPS o cadena vacía; se requiere contenido o enlace.',
  })
  @Transform(trim)
  @IsString()
  @Length(0, 2000)
  url: string;
  @ApiProperty({ example: true })
  @IsBoolean()
  published: boolean;
  @ApiPropertyOptional({
    minimum: 0,
    description: 'Revisión actual obtenida por GET; necesaria al editar.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  revision?: number;
}
export class TaskDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID real del módulo al que pertenece la tarea.',
  })
  @IsUUID()
  moduleId: string;
  @ApiProperty({
    minLength: 3,
    maxLength: 180,
    example: 'Resumen de la lección',
  })
  @Transform(trim)
  @IsString()
  @Length(3, 180)
  title: string;
  @ApiProperty({
    minLength: 5,
    maxLength: 12000,
    example: 'Explica con tus palabras las ideas principales.',
  })
  @Transform(trim)
  @IsString()
  @Length(5, 12000)
  instructions: string;
  @ApiProperty({
    format: 'date-time',
    description:
      'Plazo ISO 8601; elegir una fecha futura para la demostración.',
  })
  @IsDateString({ strict: true })
  dueAt: string;
  @ApiProperty({ example: false })
  @IsBoolean()
  allowLate: boolean;
  @ApiProperty({ minimum: 1, maximum: 20, example: 2 })
  @IsInt()
  @Min(1)
  @Max(20)
  maxSubmissions: number;
  @ApiProperty({ example: true })
  @IsBoolean()
  published: boolean;
  @ApiPropertyOptional({
    minimum: 0,
    description: 'Revisión actual obtenida por GET; necesaria al editar.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  revision?: number;
}
export class SubmitTaskDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'UUID nuevo por entrega; conservarlo al reintentar la misma operación.',
  })
  @IsUUID()
  operationId: string;
  @ApiProperty({
    maxLength: 12000,
    example: 'Mi resumen de las ideas principales de la lección.',
  })
  @Transform(trim)
  @IsString()
  @Length(0, 12000)
  text: string;
  @ApiProperty({ maxLength: 3000, example: '' })
  @Transform(trim)
  @IsString()
  @Length(0, 3000)
  comment: string;
  @ApiProperty({
    maxLength: 2000,
    example: '',
    description: 'Enlace HTTPS o cadena vacía.',
  })
  @Transform(trim)
  @IsString()
  @Length(0, 2000)
  url: string;
}
export class TaskFeedbackDto {
  @ApiProperty({
    format: 'uuid',
    description: 'UUID nuevo por comentario; conservarlo al reintentar.',
  })
  @IsUUID()
  operationId: string;
  @ApiProperty({
    minLength: 3,
    maxLength: 3000,
    example: 'Buen desarrollo; amplía el ejemplo de la conclusión.',
  })
  @Transform(trim)
  @IsString()
  @Length(3, 3000)
  comment: string;
}
