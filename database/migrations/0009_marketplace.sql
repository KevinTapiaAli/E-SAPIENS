INSERT INTO lms.permisos(codigo,descripcion) VALUES
 ('commerce.manage','Gestionar planes y verificar pagos manuales')
ON CONFLICT(codigo) DO NOTHING;
INSERT INTO lms.rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM lms.roles r CROSS JOIN lms.permisos p
WHERE r.codigo IN ('administrador','administrador_general') AND p.codigo='commerce.manage'
ON CONFLICT DO NOTHING;

INSERT INTO lms.proveedores_pago(codigo,nombre,automatico)
VALUES('manual_institucional','Transferencia o QR institucional',false)
ON CONFLICT(codigo) DO NOTHING;

ALTER TABLE lms.pagos ADD COLUMN revisado_por uuid REFERENCES lms.usuarios,
 ADD COLUMN revisado_en timestamptz, ADD COLUMN motivo_revision text;
CREATE INDEX ordenes_usuario_id ON lms.ordenes(usuario_id,id);
CREATE INDEX pagos_pendientes_id ON lms.pagos(id) WHERE estado='pendiente';
CREATE INDEX pagos_orden_id ON lms.pagos(orden_id);
CREATE INDEX evaluaciones_curso_id ON lms.evaluaciones(curso_id,id);

