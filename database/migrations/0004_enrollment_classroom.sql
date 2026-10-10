-- Solicitudes, autorizaciones institucionales y aula. Sin alterar datos existentes.
INSERT INTO lms.permisos(codigo,descripcion) VALUES
 ('academic.access','Autorizar y revocar accesos institucionales a módulos'),
 ('classroom.study','Estudiar las lecciones autorizadas y registrar avance propio')
ON CONFLICT(codigo) DO NOTHING;
INSERT INTO lms.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM lms.roles r CROSS JOIN lms.permisos p
WHERE (r.codigo IN ('administrador','administrador_general') AND p.codigo='academic.access')
 OR (r.codigo='estudiante' AND p.codigo='classroom.study')
ON CONFLICT(rol_id,permiso_id) DO NOTHING;

CREATE TABLE lms.solicitudes_inscripcion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 estudiante_id uuid NOT NULL REFERENCES lms.usuarios,
 curso_id uuid NOT NULL REFERENCES lms.cursos,
 estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobada','rechazada')),
 revisado_por uuid REFERENCES lms.usuarios, revisado_en timestamptz, motivo text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(estudiante_id,curso_id),
 CHECK((estado='pendiente' AND revisado_por IS NULL AND revisado_en IS NULL)
 OR (estado<>'pendiente' AND revisado_por IS NOT NULL AND revisado_en IS NOT NULL AND motivo IS NOT NULL))
);
CREATE TRIGGER auditar_solicitud_inscripcion AFTER INSERT OR UPDATE OR DELETE
ON lms.solicitudes_inscripcion FOR EACH ROW EXECUTE FUNCTION lms.auditar();

-- El ID de operación evita duplicar concesiones si se reintenta una petición.
CREATE TABLE lms.autorizaciones_academicas (
 id uuid PRIMARY KEY,
 inscripcion_id uuid NOT NULL REFERENCES lms.inscripciones,
 autorizado_por uuid NOT NULL REFERENCES lms.usuarios,
 solicitud jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER auditar_autorizacion_academica AFTER INSERT OR UPDATE OR DELETE
ON lms.autorizaciones_academicas FOR EACH ROW EXECUTE FUNCTION lms.auditar();
ALTER TABLE lms.accesos_modulo ADD COLUMN autorizacion_id uuid REFERENCES lms.autorizaciones_academicas;
ALTER TABLE lms.accesos_modulo ADD COLUMN revocado_por uuid REFERENCES lms.usuarios;
ALTER TABLE lms.accesos_modulo ADD COLUMN motivo_revocacion text;
ALTER TABLE lms.accesos_modulo ADD CONSTRAINT acceso_autorizacion_modulo_unico UNIQUE(autorizacion_id,modulo_id);
