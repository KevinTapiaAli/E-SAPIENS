CREATE TABLE lms.fotos_perfil (
  usuario_id uuid PRIMARY KEY REFERENCES lms.usuarios(id) ON DELETE CASCADE,
  contenido bytea NOT NULL CHECK (octet_length(contenido) BETWEEN 4 AND 32768),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lms.agenda_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES lms.usuarios(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 180),
  fecha date NOT NULL,
  completado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agenda_personal_usuario_fecha_idx ON lms.agenda_personal(usuario_id,fecha,id);

CREATE TABLE lms.historial_calificaciones_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES lms.entregas_tarea(id),
  docente_id uuid NOT NULL REFERENCES lms.usuarios(id),
  nota_anterior numeric(5,2),
  nota_nueva numeric(5,2) NOT NULL CHECK (nota_nueva BETWEEN 0 AND 100),
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historial_calificaciones_entrega_idx ON lms.historial_calificaciones_entrega(entrega_id,created_at);

CREATE INDEX entregas_resumen_inscripcion_idx ON lms.entregas_tarea(inscripcion_id,tarea_id,numero DESC) INCLUDE(nota);
CREATE INDEX tareas_agenda_publicada_idx ON lms.tareas(fecha_limite) WHERE publicada;
CREATE INDEX sesiones_agenda_idx ON lms.sesiones_clase(inicia_en) WHERE estado<>'cancelada';
CREATE INDEX sesiones_seguimiento_idx ON lms.sesiones_clase(curso_id,inicia_en) WHERE estado='finalizada';
