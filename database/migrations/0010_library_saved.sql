CREATE TABLE lms.biblioteca_guardados (
 usuario_id uuid NOT NULL REFERENCES lms.usuarios,
 item_id uuid NOT NULL REFERENCES lms.biblioteca_items,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(usuario_id,item_id)
);
COMMENT ON TABLE lms.biblioteca_guardados IS 'Lista personal de referencias; guardar una ficha no otorga acceso a archivos privados.';

