import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { AcademicListQuery } from './academic.dto';

export class ProgressRoleQuery {
  @ApiProperty({ enum: ['administrador', 'docente'] })
  @IsIn(['administrador', 'docente'])
  role: 'administrador' | 'docente';
}

export class ProgressQuery extends AcademicListQuery {
  @ApiProperty({ enum: ['administrador', 'docente', 'estudiante'] })
  @IsIn(['administrador', 'docente', 'estudiante'])
  role: 'administrador' | 'docente' | 'estudiante';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    enum: ['todos', 'activa', 'suspendida', 'abandonada', 'cancelada'],
  })
  @IsIn(['todos', 'activa', 'suspendida', 'abandonada', 'cancelada'])
  state = 'activa';

  @ApiPropertyOptional({
    enum: [
      'todos',
      'sin_iniciar',
      'en_curso',
      'completado',
      'sin_contenido',
      'sin_actividad',
      'sin_cobertura',
    ],
  })
  @IsIn([
    'todos',
    'sin_iniciar',
    'en_curso',
    'completado',
    'sin_contenido',
    'sin_actividad',
    'sin_cobertura',
  ])
  stage = 'todos';
}

export class ReportQuery extends ProgressQuery {
  @IsIn(['avance', 'tareas', 'asistencia', 'acceso'])
  topic: 'avance' | 'tareas' | 'asistencia' | 'acceso';
}
