import { Controller, Get, Header, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IdentityService } from '../identity/identity.service';
import { IdentitySecurityService } from '../identity/identity-security.service';
import { studentActivitySql } from '../analytics/dashboard.queries';

@ApiTags('Administration')
@ApiCookieAuth()
@Controller('academic/dashboard')
export class AdminDashboardController {
  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
    private readonly security: IdentitySecurityService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Indicadores, distribución y evolución académica calculados desde PostgreSQL',
  })
  async dashboard(@Req() req: Request) {
    const user = await this.identity.authenticate(this.security.token(req));
    this.identity.authorize(user, 'administrador', 'dashboard.admin');
    this.identity.authorize(user, 'administrador', 'academic.read');
    const result = await this.db
      .query(`WITH activity AS (${studentActivitySql}), latest AS (
      SELECT DISTINCT ON(tarea_id,inscripcion_id) nota FROM lms.entregas_tarea ORDER BY tarea_id,inscripcion_id,numero DESC
    ) SELECT jsonb_build_object(
      'students',(SELECT count(*) FROM lms.usuarios u WHERE EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='estudiante')),
      'teachers',(SELECT count(*) FROM lms.usuarios u WHERE EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='docente')),
      'administrators',(SELECT count(*) FROM lms.usuarios u WHERE EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo IN ('administrador','administrador_general'))),
      'courses',(SELECT count(*) FROM lms.cursos WHERE estado='publicado'),
      'enrollments',(SELECT count(*) FROM lms.inscripciones WHERE estado='activa'),
      'requests',(SELECT count(*) FROM lms.solicitudes_inscripcion WHERE estado='pendiente')+(SELECT count(*) FROM lms.usuarios WHERE estado='pendiente'),
      'activeStudents',(SELECT count(DISTINCT a.id) FROM activity a JOIN lms.inscripciones i ON i.id=a.enrollment_id JOIN lms.usuarios u ON u.id=i.estudiante_id WHERE a.at>=now()-interval '30 days' AND a.at<=now() AND i.estado='activa' AND u.estado='aprobado'),
      'evaluations',(SELECT count(*) FROM lms.intentos_evaluacion WHERE estado IN ('entregado','calificado')),
      'pendingGrading',(SELECT count(*) FROM latest WHERE nota IS NULL),
      'activity',(SELECT count(*) FROM activity WHERE at>=now()-interval '30 days' AND at<=now()),
      'payments',(SELECT count(*) FROM lms.pagos WHERE estado='pendiente')
    ) AS counts,
    coalesce((SELECT jsonb_agg(x ORDER BY x.label) FROM (SELECT c.titulo AS label,count(DISTINCT i.estudiante_id)::int AS value FROM lms.cursos c LEFT JOIN lms.inscripciones i ON i.curso_id=c.id AND i.estado='activa' WHERE c.estado='publicado' GROUP BY c.id ORDER BY c.titulo LIMIT 10) x),'[]') AS "studentsByCourse",
    coalesce((SELECT jsonb_agg(x ORDER BY x.label) FROM (SELECT estado AS label,count(*)::int AS value FROM lms.inscripciones GROUP BY estado) x),'[]') AS "enrollmentStates",
    coalesce((SELECT jsonb_agg(x ORDER BY x.label) FROM (SELECT u.nombres||' '||u.apellidos AS label,count(d.curso_id)::int AS value FROM lms.usuarios u LEFT JOIN lms.curso_docentes d ON d.docente_id=u.id WHERE EXISTS(SELECT 1 FROM lms.usuario_roles ur JOIN lms.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.codigo='docente') GROUP BY u.id ORDER BY label LIMIT 10) x),'[]') AS "teacherCourses",
    (SELECT jsonb_agg(jsonb_build_object('label',to_char(d,'DD/MM'),'value',(SELECT count(*) FROM activity a WHERE a.at>=d AND a.at<d+interval '1 day')) ORDER BY d) FROM generate_series(date_trunc('day',now())-interval '13 days',date_trunc('day',now()),interval '1 day') d) AS "academicActivity",
    (SELECT jsonb_agg(jsonb_build_object('label',to_char(d,'DD/MM'),'value',(SELECT count(*) FROM lms.inscripciones i WHERE i.inscrito_en>=d AND i.inscrito_en<d+interval '7 days')) ORDER BY d) FROM generate_series(date_trunc('week',now())-interval '7 weeks',date_trunc('week',now()),interval '7 days') d) AS "enrollmentTrend"`);
    return { ...result.rows[0], generatedAt: new Date().toISOString() };
  }
}
