import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AcademicRole {
  Student = 'estudiante',
  Teacher = 'docente',
  Admin = 'administrador',
}

export class AcademicListQuery {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 24, default: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit = 12;
}
export class AcademicCoursesQuery extends AcademicListQuery {
  @ApiProperty({ enum: AcademicRole })
  @IsIn(Object.values(AcademicRole))
  role: AcademicRole;
}
export class AcademicPeopleQuery extends AcademicListQuery {
  @ApiPropertyOptional({ enum: ['estudiante', 'docente', 'todos'] })
  @IsIn(['estudiante', 'docente', 'todos'])
  kind: 'estudiante' | 'docente' | 'todos' = 'todos';

  @ApiPropertyOptional({
    enum: ['aprobado', 'pendiente', 'rechazado', 'suspendido', 'todos'],
  })
  @IsIn(['aprobado', 'pendiente', 'rechazado', 'suspendido', 'todos'])
  state = 'todos';
}
export class AcademicOperationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  qualificationConfirmed?: boolean;
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  courseId: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Student or teacher according to the operation; validated by NestJS',
  })
  @IsUUID()
  personId: string;

  @ApiProperty({ minLength: 5, maxLength: 500 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 500)
  reason: string;
}
