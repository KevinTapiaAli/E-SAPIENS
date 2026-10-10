-- Incremental: preserves accounts, assignments and existing permissions.
INSERT INTO lms.roles(codigo,nombre) VALUES
 ('estudiante','Estudiante'),('docente','Docente'),
 ('administrador','Administrador'),('administrador_general','Administrador general')
ON CONFLICT(codigo) DO NOTHING;

INSERT INTO lms.permisos(codigo,descripcion) VALUES
 ('identity.review','Revisar y aprobar solicitudes de estudiantes'),
 ('dashboard.student','Consultar las inscripciones propias'),
 ('dashboard.teacher','Consultar los cursos asignados'),
 ('dashboard.admin','Consultar el resumen administrativo')
ON CONFLICT(codigo) DO NOTHING;

INSERT INTO lms.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM lms.roles r CROSS JOIN lms.permisos p
WHERE (r.codigo='estudiante' AND p.codigo='dashboard.student')
 OR (r.codigo='docente' AND p.codigo='dashboard.teacher')
 OR (r.codigo IN ('administrador','administrador_general') AND p.codigo IN ('dashboard.admin','identity.review'))
ON CONFLICT(rol_id,permiso_id) DO NOTHING;
