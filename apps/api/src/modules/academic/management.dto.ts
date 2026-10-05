import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { EnrollmentReasonDto } from './enrollment.dto';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CourseEditorDto extends EnrollmentReasonDto {
  @ApiProperty() @Transform(trimText) @IsString() @Length(3, 180) title: string;
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @Length(2, 100)
  category: string;
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @Length(10, 4000)
  description: string;
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @Length(5, 4000)
  objectives: string;
  @ApiProperty() @Transform(trimText) @IsString() @Length(2, 60) level: string;
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(9999)
  durationHours: number;
  @ApiProperty({ enum: ['borrador', 'revision', 'publicado', 'archivado'] })
  @IsIn(['borrador', 'revision', 'publicado', 'archivado'])
  status: string;
  @ApiProperty() @IsBoolean() requireLessons: boolean;
  @ApiProperty({ enum: ['ninguno', 'presentar', 'aprobar'] })
  @IsIn(['ninguno', 'presentar', 'aprobar'])
  exam: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) revision?: number;
}
export class ModuleEditorDto extends EnrollmentReasonDto {
  @ApiProperty() @Transform(trimText) @IsString() @Length(3, 180) title: string;
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @Length(5, 4000)
  description: string;
  @ApiProperty() @IsInt() @Min(1) @Max(10000) order: number;
  @ApiProperty() @IsBoolean() published: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) revision?: number;
}
export class LessonEditorDto extends EnrollmentReasonDto {
  @ApiProperty() @Transform(trimText) @IsString() @Length(3, 180) title: string;
  @ApiProperty({ enum: ['lectura', 'actividad', 'enlace'] })
  @IsIn(['lectura', 'actividad', 'enlace'])
  type: string;
  @ApiProperty() @IsString() @Length(0, 20000) content: string;
  @ApiProperty() @IsInt() @Min(1) @Max(10000) order: number;
  @ApiProperty() @IsInt() @Min(0) @Max(10000) durationMinutes: number;
  @ApiProperty() @IsBoolean() published: boolean;
  @ApiProperty() @IsBoolean() required: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) revision?: number;
}
export class EnrollmentStateDto extends EnrollmentReasonDto {
  @ApiProperty({ enum: ['activa', 'suspendida', 'abandonada', 'cancelada'] })
  @IsIn(['activa', 'suspendida', 'abandonada', 'cancelada'])
  status: string;
  @ApiProperty({ description: 'Estado mostrado al abrir el formulario' })
  @IsIn(['activa', 'suspendida', 'abandonada', 'cancelada'])
  expectedStatus: string;
}
