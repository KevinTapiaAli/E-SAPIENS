INSERT INTO lms.permisos(codigo,descripcion) VALUES
 ('academic.read','Consultar cuentas, cursos y matrículas para gestión académica'),
 ('academic.enroll','Registrar una matrícula administrativa de estudiante'),
 ('academic.assign','Asignar un docente aprobado a un curso')
ON CONFLICT(codigo) DO NOTHING;

INSERT INTO lms.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM lms.roles r CROSS JOIN lms.permisos p
WHERE r.codigo IN ('administrador','administrador_general')
 AND p.codigo IN ('academic.read','academic.enroll','academic.assign')
ON CONFLICT(rol_id,permiso_id) DO NOTHING;

-- Preserve existing assignments. New assignments keep actor and rationale.
ALTER TABLE lms.curso_docentes ADD COLUMN asignado_por uuid REFERENCES lms.usuarios;
ALTER TABLE lms.curso_docentes ADD COLUMN motivo text;
CREATE TRIGGER auditar_asignacion_docente AFTER INSERT OR UPDATE OR DELETE
ON lms.curso_docentes FOR EACH ROW EXECUTE FUNCTION lms.auditar();
