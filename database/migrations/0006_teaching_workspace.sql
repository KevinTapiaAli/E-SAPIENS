INSERT INTO lms.permisos(codigo,descripcion) VALUES
 ('teaching.manage','Gestionar materiales y tareas de materias asignadas'),
 ('teaching.enroll','Revisar solicitudes de inscripción en materias asignadas')
ON CONFLICT(codigo) DO NOTHING;
INSERT INTO lms.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM lms.roles r CROSS JOIN lms.permisos p
WHERE r.codigo='docente' AND p.codigo IN ('teaching.manage','teaching.enroll')
ON CONFLICT(rol_id,permiso_id) DO NOTHING;

ALTER TABLE lms.perfiles_docentes ADD COLUMN curriculum_url text;
ALTER TABLE lms.perfiles_docentes ADD COLUMN revision_formacion text;
ALTER TABLE lms.perfiles_docentes ADD COLUMN revisado_por uuid REFERENCES lms.usuarios;
ALTER TABLE lms.perfiles_docentes ADD COLUMN revisado_en timestamptz;
ALTER TABLE lms.perfiles_docentes ADD COLUMN revision integer NOT NULL DEFAULT 0;
CREATE TRIGGER revision_perfil_docente BEFORE UPDATE ON lms.perfiles_docentes FOR EACH ROW EXECUTE FUNCTION lms.incrementar_revision_editor();
CREATE TRIGGER auditar_perfil_docente AFTER INSERT OR UPDATE OR DELETE ON lms.perfiles_docentes FOR EACH ROW EXECUTE FUNCTION lms.auditar();
ALTER TABLE lms.curso_docentes ADD COLUMN formacion_revisada jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE lms.materiales_docentes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 curso_id uuid NOT NULL REFERENCES lms.cursos,
 modulo_id uuid NOT NULL,
 titulo text NOT NULL,
 tipo text NOT NULL CHECK(tipo IN ('apoyo','contenido','referencia')),
 contenido text NOT NULL DEFAULT '',
 enlace text,
 publicado boolean NOT NULL DEFAULT false,
 creado_por uuid NOT NULL REFERENCES lms.usuarios,
 editado_por uuid NOT NULL REFERENCES lms.usuarios,
 revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(modulo_id,curso_id) REFERENCES lms.modulos(id,curso_id),
 CHECK(length(btrim(contenido))>0 OR enlace IS NOT NULL)
);
CREATE INDEX materiales_por_curso ON lms.materiales_docentes(curso_id,id);
CREATE TRIGGER revision_material BEFORE UPDATE ON lms.materiales_docentes FOR EACH ROW EXECUTE FUNCTION lms.incrementar_revision_editor();
CREATE TRIGGER auditar_material AFTER INSERT OR UPDATE OR DELETE ON lms.materiales_docentes FOR EACH ROW EXECUTE FUNCTION lms.auditar();

ALTER TABLE lms.tareas ADD COLUMN publicada boolean NOT NULL DEFAULT true;
ALTER TABLE lms.tareas ADD COLUMN revision integer NOT NULL DEFAULT 0;
ALTER TABLE lms.tareas ADD COLUMN creado_por uuid REFERENCES lms.usuarios;
ALTER TABLE lms.tareas ADD COLUMN editado_por uuid REFERENCES lms.usuarios;
CREATE INDEX tareas_por_curso ON lms.tareas(curso_id,id);
CREATE TRIGGER revision_tarea BEFORE UPDATE ON lms.tareas FOR EACH ROW EXECUTE FUNCTION lms.incrementar_revision_editor();
CREATE TRIGGER auditar_tarea AFTER INSERT OR UPDATE OR DELETE ON lms.tareas FOR EACH ROW EXECUTE FUNCTION lms.auditar();
ALTER TABLE lms.entregas_tarea ADD COLUMN comentario_estudiante text NOT NULL DEFAULT '';
ALTER TABLE lms.entregas_tarea ADD COLUMN enlace text;
ALTER TABLE lms.entregas_tarea ADD COLUMN operacion_id uuid;
CREATE UNIQUE INDEX entrega_operacion_unica ON lms.entregas_tarea(inscripcion_id,operacion_id) WHERE operacion_id IS NOT NULL;
CREATE INDEX entregas_por_tarea ON lms.entregas_tarea(tarea_id,id);
CREATE TRIGGER auditar_entrega AFTER INSERT OR UPDATE OR DELETE ON lms.entregas_tarea FOR EACH ROW EXECUTE FUNCTION lms.auditar();
ALTER TABLE lms.retroalimentaciones ADD COLUMN operacion_id uuid UNIQUE;
CREATE INDEX respuestas_por_entrega ON lms.retroalimentaciones(entrega_id,created_at,id);
CREATE INDEX solicitudes_por_materia ON lms.solicitudes_inscripcion(curso_id,estado,id);
CREATE TRIGGER auditar_retroalimentacion AFTER INSERT OR UPDATE OR DELETE ON lms.retroalimentaciones FOR EACH ROW EXECUTE FUNCTION lms.auditar();
