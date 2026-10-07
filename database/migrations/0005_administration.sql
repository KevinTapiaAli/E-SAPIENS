INSERT INTO lms.permisos(codigo,descripcion) VALUES
 ('identity.manage','Crear y administrar cuentas desde la web'),
 ('academic.edit','Gestionar contenido y publicación de materias')
ON CONFLICT(codigo) DO NOTHING;
INSERT INTO lms.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM lms.roles r CROSS JOIN lms.permisos p
WHERE r.codigo IN ('administrador','administrador_general') AND p.codigo IN ('identity.manage','academic.edit')
ON CONFLICT(rol_id,permiso_id) DO NOTHING;

ALTER TABLE lms.cursos ADD COLUMN revision integer NOT NULL DEFAULT 0;
ALTER TABLE lms.modulos ADD COLUMN revision integer NOT NULL DEFAULT 0;
ALTER TABLE lms.lecciones ADD COLUMN revision integer NOT NULL DEFAULT 0;
ALTER TABLE lms.cursos ADD COLUMN motivo_edicion text;
ALTER TABLE lms.modulos ADD COLUMN motivo_edicion text;
ALTER TABLE lms.lecciones ADD COLUMN motivo_edicion text;
CREATE FUNCTION lms.incrementar_revision_editor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.revision=OLD.revision+1; RETURN NEW; END $$;
CREATE TRIGGER revision_editor BEFORE UPDATE ON lms.cursos FOR EACH ROW EXECUTE FUNCTION lms.incrementar_revision_editor();
CREATE TRIGGER revision_editor BEFORE UPDATE ON lms.modulos FOR EACH ROW EXECUTE FUNCTION lms.incrementar_revision_editor();
CREATE TRIGGER revision_editor BEFORE UPDATE ON lms.lecciones FOR EACH ROW EXECUTE FUNCTION lms.incrementar_revision_editor();
CREATE TRIGGER auditar_editor AFTER INSERT OR UPDATE OR DELETE ON lms.modulos FOR EACH ROW EXECUTE FUNCTION lms.auditar();
CREATE TRIGGER auditar_editor AFTER INSERT OR UPDATE OR DELETE ON lms.lecciones FOR EACH ROW EXECUTE FUNCTION lms.auditar();
CREATE TRIGGER auditar_reglas AFTER INSERT OR UPDATE OR DELETE ON lms.reglas_curso FOR EACH ROW EXECUTE FUNCTION lms.auditar();
