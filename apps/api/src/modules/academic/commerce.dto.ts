import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() courseId: string;
  @ApiProperty({ example: 'Acceso completo al curso', maxLength: 120 })
  @IsString()
  @Length(5, 120)
  name: string;
  @ApiProperty({
    example: '120.00',
    description: 'Importe decimal positivo, máximo 999999.99',
  })
  @Matches(/^(?:0|[1-9]\d{0,5})\.\d{2}$/)
  price: string;
  @ApiProperty({ enum: ['BOB', 'USD'] }) @IsIn(['BOB', 'USD']) currency: string;
  @ApiProperty({ example: 90, minimum: 1, maximum: 3650 })
  @IsInt()
  @Min(1)
  @Max(3650)
  days: number;
}
export class CreateOrderDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() planId: string;
  @ApiProperty({
    format: 'uuid',
    description: 'UUID estable por compra; repetirlo no duplica la orden',
  })
  @IsUUID()
  operationId: string;
}
export class ReportPaymentDto {
  @ApiProperty({ enum: ['transferencia', 'qr'] })
  @IsIn(['transferencia', 'qr'])
  method: string;
  @ApiProperty({ example: 'BANCO-2026-000123', minLength: 6, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9][A-Z0-9._/-]{5,99}$/)
  reference: string;
}
export class ReviewPaymentDto {
  @ApiProperty({ enum: ['confirmar', 'rechazar'] })
  @IsIn(['confirmar', 'rechazar'])
  decision: string;
  @ApiProperty({
    example: 'Referencia e importe cotejados con el extracto bancario.',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @Length(10, 500)
  reason: string;
}
