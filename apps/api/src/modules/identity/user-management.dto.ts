import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { RegisterDto } from './identity.dto';
const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateManagedUserDto extends RegisterDto {
  @ApiProperty({ enum: ['estudiante', 'docente', 'administrador'] })
  @IsIn(['estudiante', 'docente', 'administrador'])
  role: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  specialty?: string;
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(0, 2000)
  curriculumUrl?: string;
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(0, 1000)
  qualificationReview?: string;
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @Length(5, 500)
  reason: string;
}
export class ManagedUserStateDto {
  @ApiProperty({ enum: ['aprobado', 'suspendido'] })
  @IsIn(['aprobado', 'suspendido'])
  status: string;
  @ApiProperty()
  @IsIn(['aprobado', 'suspendido', 'pendiente', 'rechazado'])
  expectedStatus: string;
  @ApiProperty()
  @Transform(trimText)
  @IsString()
  @Length(5, 500)
  reason: string;
}
export class TeacherProfileReviewDto {
  @Transform(trimText) @IsString() @Length(3, 200) specialty: string;
  @Transform(trimText) @IsString() @Length(0, 2000) curriculumUrl: string;
  @Transform(trimText)
  @IsString()
  @Length(10, 1000)
  qualificationReview: string;
  @IsInt() @Min(0) revision: number;
}
