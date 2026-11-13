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
  @ApiPropertyOptional({
    maxLength: 2000,
    description: 'Enlace HTTPS al currículum, o cadena vacía.',
  })
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @Length(0, 2000)
  curriculumUrl?: string;
  @ApiPropertyOptional({
    maxLength: 1000,
    description: 'Revisión de formación docente.',
  })
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
  @ApiProperty({ minLength: 3, maxLength: 200, example: 'Ciencias naturales' })
  @Transform(trimText)
  @IsString()
  @Length(3, 200)
  specialty: string;
  @ApiProperty({
    maxLength: 2000,
    example: '',
    description: 'Enlace HTTPS al currículum, o cadena vacía.',
  })
  @Transform(trimText)
  @IsString()
  @Length(0, 2000)
  curriculumUrl: string;
  @ApiProperty({
    minLength: 10,
    maxLength: 1000,
    example: 'Formación revisada y adecuada para impartir la materia.',
  })
  @Transform(trimText)
  @IsString()
  @Length(10, 1000)
  qualificationReview: string;
  @ApiProperty({
    minimum: 0,
    description:
      'profileRevision actual de la consulta de docentes; evita sobrescribir cambios concurrentes.',
  })
  @IsInt()
  @Min(0)
  revision: number;
}
