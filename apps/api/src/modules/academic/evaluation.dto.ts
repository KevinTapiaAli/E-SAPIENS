import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
export class QuestionDto {
  @ApiProperty({ example: '¿Qué protocolo cifra la comunicación web?' })
  @IsString()
  @Length(5, 1000)
  text: string;
  @ApiProperty({
    type: [String],
    example: ['HTTP', 'HTTPS'],
    minItems: 2,
    maxItems: 6,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 300, { each: true })
  options: string[];
  @ApiProperty({
    example: 1,
    description:
      'Índice de la opción correcta, comenzando en cero. Solo escritura docente.',
  })
  @IsInt()
  @Min(0)
  @Max(5)
  correctIndex: number;
}
export class CreateEvaluationDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() moduleId: string;
  @ApiProperty({ example: 'Evaluación del módulo 1' })
  @IsString()
  @Length(5, 150)
  title: string;
  @ApiProperty({ example: 30, minimum: 1, maximum: 180 })
  @IsInt()
  @Min(1)
  @Max(180)
  minutes: number;
  @ApiProperty({ example: 3, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  attempts: number;
  @ApiProperty({ example: 60, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore: number;
  @ApiProperty({ type: [QuestionDto], minItems: 1, maxItems: 30 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
export class AnswerDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() questionId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() optionId: string;
}
export class SubmitEvaluationDto {
  @ApiProperty({ type: [AnswerDto], maxItems: 30 })
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique((answer: AnswerDto) => answer.questionId)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
