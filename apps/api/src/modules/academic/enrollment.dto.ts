import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { AcademicListQuery } from './academic.dto';

export class EnrollmentRequestsQuery extends AcademicListQuery {
  @ApiProperty({ enum: ['docente', 'administrador'] })
  @IsIn(['docente', 'administrador'])
  role: 'docente' | 'administrador' = 'administrador';
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  courseId?: string;
}

export class EnrollmentReasonDto {
  @ApiProperty({ minLength: 5, maxLength: 500 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 500)
  reason: string;
}
export class RequestEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  courseId: string;
}
export class ReviewEnrollmentDto extends EnrollmentReasonDto {
  @ApiProperty({ enum: ['aprobar', 'rechazar'] })
  @IsIn(['aprobar', 'rechazar'])
  decision: 'aprobar' | 'rechazar';
}
export class GrantAccessDto extends EnrollmentReasonDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Clave de idempotencia de esta autorización',
  })
  @IsUUID()
  operationId: string;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  moduleIds: string[];

  @ApiProperty({ minimum: 1, maximum: 3650 })
  @IsInt()
  @Min(1)
  @Max(3650)
  days: number;
}
