-- Medición agregada y atribución opcional. No sustituye registros académicos.
CREATE TABLE lms.web_analytics_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO lms.web_analytics_config DEFAULT VALUES;

CREATE TABLE lms.web_visits_daily (
  day date NOT NULL,
  visitor_hash text NOT NULL CHECK (visitor_hash ~ '^[a-f0-9]{64}$'),
  resource text NOT NULL CHECK (length(resource) BETWEEN 1 AND 256),
  course_id uuid REFERENCES lms.cursos(id) ON DELETE CASCADE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, visitor_hash, resource)
);
COMMENT ON TABLE lms.web_visits_daily IS
 'Navegadores estimados por día UTC/recurso; sin IP, user-agent ni identidad. Retención: 190 días.';

ALTER TABLE lms.usuarios ADD COLUMN web_visitor_hash text
  CHECK (web_visitor_hash IS NULL OR web_visitor_hash ~ '^[a-f0-9]{64}$');
ALTER TABLE lms.solicitudes_inscripcion ADD COLUMN web_visitor_hash text
  CHECK (web_visitor_hash IS NULL OR web_visitor_hash ~ '^[a-f0-9]{64}$');

COMMENT ON COLUMN lms.usuarios.web_visitor_hash IS 'Atribución opcional de solicitud web; no otorga identidad ni permisos.';
COMMENT ON COLUMN lms.solicitudes_inscripcion.web_visitor_hash IS 'Atribución opcional de solicitud real; no enviada como autoridad por el cliente.';
