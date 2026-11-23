import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';

export class ExportQuery {
  @IsIn(['administrador', 'docente'])
  role: 'administrador' | 'docente' = 'administrador';
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q = '';
  @IsIn([
    'todos',
    'aprobado',
    'pendiente',
    'rechazado',
    'suspendido',
    'activa',
    'suspendida',
    'abandonada',
    'cancelada',
  ])
  state = 'todos';
  @IsOptional()
  @IsUUID()
  courseId?: string;
}

export function excelText(value: unknown): string | number {
  if (typeof value === 'number') return value;
  const text = String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .slice(0, 32760);
  return /^[\s\uFEFF]*[=+\-@]/u.test(text) ? `'${text}` : text;
}

@ApiTags('Exportaciones Excel')
@ApiCookieAuth()
@Controller('academic/exports')
export class ExportsController {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}

  @Get(':kind')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({
    summary:
      'Excel de docentes o estudiantes, con filtros y alcance verificado de la sesión',
  })
  async export(
    @Param('kind') kind: string,
    @Query() query: ExportQuery,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.identity.authenticate(this.security.token(req));
    this.identity.authorize(
      user,
      query.role,
      query.role === 'docente' ? 'teaching.manage' : 'academic.read',
    );
    if (!['docentes.xlsx', 'estudiantes.xlsx'].includes(kind))
      throw new NotFoundException();
    if (query.role === 'docente' && kind !== 'estudiantes.xlsx')
      this.identity.authorize(user, 'administrador', 'academic.read');
    const accountStates = [
      'todos',
      'aprobado',
      'pendiente',
      'rechazado',
      'suspendido',
    ];
    const enrollmentStates = [
      'todos',
      'activa',
      'suspendida',
      'abandonada',
      'cancelada',
    ];
    if (
      !(query.role === 'docente' ? enrollmentStates : accountStates).includes(
        query.state,
      )
    )
      throw new BadRequestException('Estado no válido para esta exportación.');
    if (query.role === 'docente' && query.courseId) {
      const allowed = await this.db.query(
        'SELECT 1 FROM lms.curso_docentes WHERE docente_id=$1 AND curso_id=$2',
        [user.id, query.courseId],
      );
      if (!allowed.rowCount)
        throw new NotFoundException('Materia no disponible para este docente.');
    }
    let headers: string[];
    let rows: Record<string, unknown>[];
    const params = [user.id, query.q, query.state, query.courseId ?? null];
    if (query.role === 'docente') {
      headers = [
        'Materia',
        'Estudiante',
        'Correo',
        'Estado de matrícula',
        'Progreso (%)',
        'Promedio tareas',
        'Mejor nota evaluación',
      ];
      const result = await this.db.query(
        `SELECT c.titulo AS materia,u.nombres||' '||u.apellidos AS estudiante,u.email::text AS correo,i.estado,
        (SELECT round(100.0*count(*) FILTER(WHERE p.completado_en IS NOT NULL)/nullif(count(*),0))::int FROM lms.lecciones l JOIN lms.modulos m ON m.id=l.modulo_id LEFT JOIN lms.progreso_lecciones p ON p.leccion_id=l.id AND p.inscripcion_id=i.id WHERE l.curso_id=c.id AND l.publicada AND m.publicado) AS progreso,
        (SELECT round(avg(e.nota)::numeric,1)::float8 FROM (SELECT DISTINCT ON(et.tarea_id) et.nota FROM lms.entregas_tarea et JOIN lms.tareas t ON t.id=et.tarea_id WHERE et.inscripcion_id=i.id AND t.publicada ORDER BY et.tarea_id,et.numero DESC) e) AS tareas,
        (SELECT max(e.nota)::float8 FROM lms.intentos_evaluacion e WHERE e.inscripcion_id=i.id AND e.estado='calificado') AS evaluacion
        FROM lms.inscripciones i JOIN lms.cursos c ON c.id=i.curso_id JOIN lms.usuarios u ON u.id=i.estudiante_id
        WHERE EXISTS(SELECT 1 FROM lms.curso_docentes d WHERE d.curso_id=c.id AND d.docente_id=$1)
        AND ($2::text='' OR strpos(lower(u.nombres||' '||u.apellidos||' '||u.email||' '||c.titulo),lower($2))>0)
        AND ($3::text='todos' OR i.estado=$3) AND ($4::uuid IS NULL OR c.id=$4)
        ORDER BY lower(c.titulo),lower(u.apellidos),u.id LIMIT 10001`,
        params,
      );
      rows = result.rows;
    } else {
      const teacher = kind === 'docentes.xlsx';
      headers = teacher
        ? [
            'Nombre completo',
            'Correo',
            'Especialidad',
            'Estado',
            'Materias asignadas',
            'Número de materias',
          ]
        : [
            'Nombre completo',
            'Correo',
            'Estado',
            'Materias inscritas',
            'Cantidad de matrículas',
            'Progreso (%)',
          ];
      const result = await this.db.query(
        `SELECT u.nombres||' '||u.apellidos AS nombre,u.email::text AS correo,
        ${teacher ? "coalesce(p.especialidad,'') AS especialidad," : ''} u.estado,
        ${
          teacher
            ? `(SELECT string_agg(c.titulo,'; ' ORDER BY c.titulo) FROM lms.curso_docentes d JOIN lms.cursos c ON c.id=d.curso_id WHERE d.docente_id=u.id) AS materias,
        (SELECT count(*)::int FROM lms.curso_docentes d WHERE d.docente_id=u.id) AS cantidad`
            : `(SELECT string_agg(c.titulo,'; ' ORDER BY c.titulo) FROM lms.inscripciones i JOIN lms.cursos c ON c.id=i.curso_id WHERE i.estudiante_id=u.id) AS materias,
        (SELECT count(*)::int FROM lms.inscripciones i WHERE i.estudiante_id=u.id) AS cantidad,
        (SELECT round(100.0*count(*) FILTER(WHERE pl.completado_en IS NOT NULL)/nullif(count(*),0))::int FROM lms.inscripciones i JOIN lms.lecciones l ON l.curso_id=i.curso_id JOIN lms.modulos m ON m.id=l.modulo_id LEFT JOIN lms.progreso_lecciones pl ON pl.inscripcion_id=i.id AND pl.leccion_id=l.id WHERE i.estudiante_id=u.id AND i.estado='activa' AND l.publicada AND m.publicado) AS progreso`
        }
        FROM lms.usuarios u ${teacher ? 'LEFT JOIN lms.perfiles_docentes p ON p.usuario_id=u.id' : ''}
        WHERE EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo=$1)
        AND ($2::text='' OR strpos(lower(u.nombres||' '||u.apellidos||' '||u.email),lower($2))>0) AND ($3::text='todos' OR u.estado=$3)
        AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM lms.${teacher ? 'curso_docentes' : 'inscripciones'} rel WHERE rel.${teacher ? 'docente_id' : 'estudiante_id'}=u.id AND rel.curso_id=$4))
        ORDER BY lower(u.apellidos),lower(u.nombres),u.id LIMIT 10001`,
        [teacher ? 'docente' : 'estudiante', ...params.slice(1)],
      );
      rows = result.rows;
    }
    if (rows.length > 10000)
      throw new BadRequestException(
        'Hay más de 10.000 filas. Aplica filtros para descargar un archivo completo.',
      );
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-SAPIENS';
    const sheet = workbook.addWorksheet(
      query.role === 'docente'
        ? 'Mis estudiantes'
        : kind.startsWith('docentes')
          ? 'Docentes'
          : 'Estudiantes',
    );
    sheet.addRow(headers);
    for (const row of rows) sheet.addRow(Object.values(row).map(excelText));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, sheet.rowCount), column: headers.length },
    };
    sheet.getRow(1).height = 28;
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4338CA' },
      };
    });
    sheet.columns.forEach((column, index) => {
      column.width = index === 0 ? 38 : index === headers.length - 2 ? 55 : 28;
      column.alignment = { vertical: 'top', wrapText: true };
    });
    const filename = `esapiens-${query.role === 'docente' ? 'mis-' : ''}${kind.replace('.xlsx', '')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Rows', String(rows.length));
    res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
  }
}
