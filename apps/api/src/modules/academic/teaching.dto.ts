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

export class TeachingQuery extends AcademicListQuery {
  @IsIn(['administrador', 'docente', 'estudiante']) role: WorkspaceRole;
}
export class GradeSubmissionDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) grade: number;
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  expectedGrade: number | null;
  @IsString() @Length(3, 3000) reason: string;
}
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class MaterialDto {
  @IsUUID() moduleId: string;
  @Transform(trim) @IsString() @Length(3, 180) title: string;
  @IsIn(['apoyo', 'contenido', 'referencia']) kind: string;
  @Transform(trim) @IsString() @Length(0, 12000) content: string;
  @Transform(trim) @IsString() @Length(0, 2000) url: string;
  @IsBoolean() published: boolean;
  @IsOptional() @IsInt() @Min(0) revision?: number;
}
export class TaskDto {
  @IsUUID() moduleId: string;
  @Transform(trim) @IsString() @Length(3, 180) title: string;
  @Transform(trim) @IsString() @Length(5, 12000) instructions: string;
  @IsDateString({ strict: true }) dueAt: string;
  @IsBoolean() allowLate: boolean;
  @IsInt() @Min(1) @Max(20) maxSubmissions: number;
  @IsBoolean() published: boolean;
  @IsOptional() @IsInt() @Min(0) revision?: number;
}
export class SubmitTaskDto {
  @IsUUID() operationId: string;
  @Transform(trim) @IsString() @Length(0, 12000) text: string;
  @Transform(trim) @IsString() @Length(0, 3000) comment: string;
  @Transform(trim) @IsString() @Length(0, 2000) url: string;
}
export class TaskFeedbackDto {
  @IsUUID() operationId: string;
  @Transform(trim) @IsString() @Length(3, 3000) comment: string;
}
