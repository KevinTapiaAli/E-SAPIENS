-- E-SAPIENS LMS — esquema inicial de referencia.
-- Extraído del SQL recibido; datos ficticios separados para evitar carga accidental en producción.

-- E-SAPIENS LMS v2 | PostgreSQL 16+ | Instalación NUEVA, no migración.
-- Ejecutar en una base VACÍA (crear esapiens_lms desde pgAdmin primero).
-- No borra esquemas ni datos existentes. Una segunda ejecución debe fallar.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA lms;
SET search_path = lms, public;
CREATE DOMAIN nota_100 AS numeric(5,2) CHECK (VALUE BETWEEN 0 AND 100);
CREATE DOMAIN dinero AS numeric(14,2) CHECK (VALUE >= 0);

-- Roles de aplicación; no son usuarios de PostgreSQL.
CREATE TABLE roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE roles IS 'Roles de aplicación; no son usuarios de PostgreSQL.';

-- Operaciones autorizables por dominio.
CREATE TABLE permisos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, descripcion text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE permisos IS 'Operaciones autorizables por dominio.';

-- Asignación N:M de permisos a roles.
CREATE TABLE rol_permisos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
rol_id uuid NOT NULL REFERENCES roles, permiso_id uuid NOT NULL REFERENCES permisos, UNIQUE(rol_id,permiso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rol_permisos IS 'Asignación N:M de permisos a roles.';

-- Cuentas aprobadas, pendientes, rechazadas o suspendidas.
CREATE TABLE usuarios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
email citext NOT NULL UNIQUE CHECK (email::text ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 username citext NOT NULL UNIQUE, nombres text NOT NULL, apellidos text NOT NULL,
 password_hash text NOT NULL CHECK (length(password_hash)>=50), telefono text,
 estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado','suspendido')),
 email_verificado_en timestamptz, aprobado_por uuid REFERENCES usuarios, aprobado_en timestamptz,
 motivo_estado text, ultimo_acceso_en timestamptz, zona_horaria text NOT NULL DEFAULT 'America/La_Paz',
 CHECK (estado <> 'aprobado' OR aprobado_en IS NOT NULL),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE usuarios IS 'Cuentas aprobadas, pendientes, rechazadas o suspendidas.';

-- Una persona puede ejercer múltiples roles.
CREATE TABLE usuario_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, rol_id uuid NOT NULL REFERENCES roles, asignado_por uuid REFERENCES usuarios, UNIQUE(usuario_id,rol_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE usuario_roles IS 'Una persona puede ejercer múltiples roles.';

-- Perfil público del capacitador.
CREATE TABLE perfiles_docentes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL UNIQUE REFERENCES usuarios, especialidad text NOT NULL, biografia text, foto_url text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE perfiles_docentes IS 'Perfil público del capacitador.';

-- Historial de aprobación y suspensión con responsable.
CREATE TABLE historial_estado_usuario (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, estado_anterior text, estado_nuevo text NOT NULL, responsable_id uuid REFERENCES usuarios, motivo text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE historial_estado_usuario IS 'Historial de aprobación y suspensión con responsable.';

-- Sesiones revocables; guardar digest del token aleatorio, no el token.
CREATE TABLE sesiones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, token_hash text NOT NULL UNIQUE, ip inet, user_agent text, vence_en timestamptz NOT NULL, revocada_en timestamptz, CHECK(vence_en>created_at),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE sesiones IS 'Sesiones revocables; guardar digest del token aleatorio, no el token.';

-- Verificación de correo y recuperación; tokens de un solo uso.
CREATE TABLE tokens_cuenta (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, tipo text NOT NULL CHECK(tipo IN ('verificacion','recuperacion')), token_hash text NOT NULL UNIQUE, vence_en timestamptz NOT NULL, usado_en timestamptz, CHECK(vence_en>created_at),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tokens_cuenta IS 'Verificación de correo y recuperación; tokens de un solo uso.';

-- Vínculo opcional con Google u otro proveedor de identidad.
CREATE TABLE identidades_externas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, proveedor text NOT NULL, subject text NOT NULL, UNIQUE(proveedor,subject),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE identidades_externas IS 'Vínculo opcional con Google u otro proveedor de identidad.';

-- Aceptaciones versionadas de términos, privacidad y analítica.
CREATE TABLE consentimientos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, tipo text NOT NULL CHECK(tipo IN ('terminos','privacidad','analitica','whatsapp')), version text NOT NULL, aceptado boolean NOT NULL, registrado_en timestamptz NOT NULL DEFAULT now(), UNIQUE(usuario_id,tipo,version),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE consentimientos IS 'Aceptaciones versionadas de términos, privacidad y analítica.';

-- Áreas temáticas del catálogo.
CREATE TABLE categorias_curso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL, slug text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE categorias_curso IS 'Áreas temáticas del catálogo.';

-- Edición académica; crear otro ID para cambiar un temario ya usado.
CREATE TABLE cursos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
categoria_id uuid NOT NULL REFERENCES categorias_curso, titulo text NOT NULL, slug text NOT NULL UNIQUE,
 descripcion text NOT NULL, objetivos text NOT NULL, nivel text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 edicion_anterior_id uuid REFERENCES cursos, idioma text NOT NULL DEFAULT 'es', portada_url text,
 duracion_horas numeric(7,2) NOT NULL CHECK(duracion_horas>0),
 estado text NOT NULL DEFAULT 'borrador' CHECK(estado IN ('borrador','revision','publicado','archivado')),
 creado_por uuid NOT NULL REFERENCES usuarios, aprobado_por uuid REFERENCES usuarios, aprobado_en timestamptz,
 CHECK(estado<>'publicado' OR (aprobado_por IS NOT NULL AND aprobado_en IS NOT NULL)),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cursos IS 'Edición académica; crear otro ID para cambiar un temario ya usado.';

-- Docentes asignados: la API limita su edición a estos cursos.
CREATE TABLE curso_docentes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, docente_id uuid NOT NULL REFERENCES perfiles_docentes(usuario_id), principal boolean NOT NULL DEFAULT false, UNIQUE(curso_id,docente_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE curso_docentes IS 'Docentes asignados: la API limita su edición a estos cursos.';

-- Requisito de completar cursos previos; se impiden ciclos.
CREATE TABLE prerrequisitos_curso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, requerido_id uuid NOT NULL REFERENCES cursos, CHECK(curso_id<>requerido_id), UNIQUE(curso_id,requerido_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE prerrequisitos_curso IS 'Requisito de completar cursos previos; se impiden ciclos.';

-- Política de avance y certificado, configurable por edición.
CREATE TABLE reglas_curso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL UNIQUE REFERENCES cursos,
 completar_lecciones boolean NOT NULL DEFAULT true, presentar_examen boolean NOT NULL DEFAULT true,
 aprobar_examen boolean NOT NULL DEFAULT false, nota_minima nota_100 NOT NULL DEFAULT 60,
 certificado_requiere_aprobar boolean NOT NULL DEFAULT false,
 CHECK(NOT aprobar_examen OR presentar_examen),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE reglas_curso IS 'Política de avance y certificado, configurable por edición.';

-- Temario secuencial; el orden define el bloqueo de módulos posteriores.
CREATE TABLE modulos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, titulo text NOT NULL, descripcion text NOT NULL, orden integer NOT NULL CHECK(orden>0), publicado boolean NOT NULL DEFAULT false, UNIQUE(curso_id,orden), UNIQUE(id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE modulos IS 'Temario secuencial; el orden define el bloqueo de módulos posteriores.';

-- Unidad de progreso y contenido; una lección pertenece a un curso.
CREATE TABLE lecciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, modulo_id uuid NOT NULL,
 titulo text NOT NULL, tipo text NOT NULL CHECK(tipo IN ('video','lectura','actividad','enlace')),
 contenido text, orden integer NOT NULL CHECK(orden>0), obligatoria boolean NOT NULL DEFAULT true,
 duracion_minutos integer NOT NULL CHECK(duracion_minutos>=0), publicada boolean NOT NULL DEFAULT false,
 FOREIGN KEY(modulo_id,curso_id) REFERENCES modulos(id,curso_id), UNIQUE(modulo_id,orden), UNIQUE(id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE lecciones IS 'Unidad de progreso y contenido; una lección pertenece a un curso.';

-- Metadatos de almacenamiento externo; nunca almacenar binarios ni URLs firmadas.
CREATE TABLE archivos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
propietario_id uuid NOT NULL REFERENCES usuarios, nombre text NOT NULL,
 proveedor text NOT NULL CHECK(proveedor IN ('s3','drive','youtube','stream','vimeo','externo')),
 clave_objeto text NOT NULL, mime_type text NOT NULL, tamano_bytes bigint CHECK(tamano_bytes>=0),
 sha256 text, privado boolean NOT NULL DEFAULT true, escaneo text NOT NULL DEFAULT 'pendiente' CHECK(escaneo IN ('pendiente','limpio','rechazado')),
 UNIQUE(proveedor,clave_objeto),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE archivos IS 'Metadatos de almacenamiento externo; nunca almacenar binarios ni URLs firmadas.';

-- Videos y documentos revisados con período de disponibilidad.
CREATE TABLE recursos_leccion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
leccion_id uuid NOT NULL REFERENCES lecciones, archivo_id uuid NOT NULL REFERENCES archivos,
 titulo text NOT NULL, permite_descarga boolean NOT NULL DEFAULT false, disponible_desde timestamptz,
 disponible_hasta timestamptz, CHECK(disponible_hasta IS NULL OR disponible_desde IS NULL OR disponible_hasta>disponible_desde),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE recursos_leccion IS 'Videos y documentos revisados con período de disponibilidad.';

-- Aprobación de un curso, recurso, lección o módulo; referencias verificables.
CREATE TABLE revisiones_contenido (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid REFERENCES cursos, modulo_id uuid REFERENCES modulos, leccion_id uuid REFERENCES lecciones,
 recurso_id uuid REFERENCES recursos_leccion, enviado_por uuid NOT NULL REFERENCES usuarios,
 estado text NOT NULL CHECK(estado IN ('pendiente','aprobado','observado','rechazado')),
 revisado_por uuid REFERENCES usuarios, revisado_en timestamptz, observacion text,
 CHECK(num_nonnulls(curso_id,modulo_id,leccion_id,recurso_id)=1),
 CHECK(estado='pendiente' OR (revisado_por IS NOT NULL AND revisado_en IS NOT NULL)),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE revisiones_contenido IS 'Aprobación de un curso, recurso, lección o módulo; referencias verificables.';

-- Autores bibliográficos, independientes de las cuentas.
CREATE TABLE autores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL, identificador_orcid text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE autores IS 'Autores bibliográficos, independientes de las cuentas.';

-- Libros y referencias; los metadatos públicos no otorgan acceso al archivo.
CREATE TABLE biblioteca_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
titulo text NOT NULL, tipo text NOT NULL CHECK(tipo IN ('libro','articulo','guia','video')), descripcion text NOT NULL, isbn text, editorial text, anio integer CHECK(anio BETWEEN 1000 AND 3000), ficha_publica boolean NOT NULL DEFAULT true, publicado boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE biblioteca_items IS 'Libros y referencias; los metadatos públicos no otorgan acceso al archivo.';

-- Historial de actualizaciones del material bibliográfico.
CREATE TABLE biblioteca_versiones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
item_id uuid NOT NULL REFERENCES biblioteca_items, numero integer NOT NULL CHECK(numero>0), archivo_id uuid NOT NULL REFERENCES archivos, cambio text NOT NULL, vigente boolean NOT NULL DEFAULT false, UNIQUE(item_id,numero),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE biblioteca_versiones IS 'Historial de actualizaciones del material bibliográfico.';

-- Relación N:M entre obras y autores.
CREATE TABLE biblioteca_autores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
item_id uuid NOT NULL REFERENCES biblioteca_items, autor_id uuid NOT NULL REFERENCES autores, orden integer NOT NULL CHECK(orden>0), UNIQUE(item_id,autor_id), UNIQUE(item_id,orden),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE biblioteca_autores IS 'Relación N:M entre obras y autores.';

-- Etiquetas bibliográficas.
CREATE TABLE biblioteca_categorias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE biblioteca_categorias IS 'Etiquetas bibliográficas.';

-- Clasificación múltiple de biblioteca.
CREATE TABLE biblioteca_item_categorias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
item_id uuid NOT NULL REFERENCES biblioteca_items, categoria_id uuid NOT NULL REFERENCES biblioteca_categorias, UNIQUE(item_id,categoria_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE biblioteca_item_categorias IS 'Clasificación múltiple de biblioteca.';

-- Índice desglosado de capítulos, temas y páginas.
CREATE TABLE biblioteca_secciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
item_id uuid NOT NULL REFERENCES biblioteca_items, titulo text NOT NULL, orden integer NOT NULL CHECK(orden>0), pagina_inicio integer CHECK(pagina_inicio>0), pagina_fin integer, CHECK(pagina_fin IS NULL OR pagina_fin>=pagina_inicio), UNIQUE(item_id,orden),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE biblioteca_secciones IS 'Índice desglosado de capítulos, temas y páginas.';

-- Bibliografía autorizada por módulo, con cita y obligatoriedad.
CREATE TABLE modulo_biblioteca (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
modulo_id uuid NOT NULL REFERENCES modulos, item_id uuid NOT NULL REFERENCES biblioteca_items, cita text NOT NULL, obligatorio boolean NOT NULL DEFAULT false, UNIQUE(modulo_id,item_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE modulo_biblioteca IS 'Bibliografía autorizada por módulo, con cita y obligatoriedad.';

-- Producto comercial versionable: curso, paquete o suscripción.
CREATE TABLE planes_acceso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL, tipo text NOT NULL CHECK(tipo IN ('curso','paquete','suscripcion')),
 precio dinero NOT NULL, moneda char(3) NOT NULL DEFAULT 'BOB' CHECK(moneda IN ('BOB','USD')),
 dias_acceso integer NOT NULL CHECK(dias_acceso>0), activo boolean NOT NULL DEFAULT true,
 descripcion text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE planes_acceso IS 'Producto comercial versionable: curso, paquete o suscripción.';

-- Cobertura explícita: cada módulo incluido debe figurar en el plan.
CREATE TABLE plan_modulos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
plan_id uuid NOT NULL REFERENCES planes_acceso, modulo_id uuid NOT NULL REFERENCES modulos, UNIQUE(plan_id,modulo_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE plan_modulos IS 'Cobertura explícita: cada módulo incluido debe figurar en el plan.';

-- Contrato; cada renovación genera otra orden, no un cobro implícito.
CREATE TABLE suscripciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, plan_id uuid NOT NULL REFERENCES planes_acceso, estado text NOT NULL CHECK(estado IN ('pendiente','activa','cancelada','vencida')), inicio timestamptz NOT NULL, fin_periodo timestamptz NOT NULL, renovar boolean NOT NULL DEFAULT false, cancelada_en timestamptz, CHECK(fin_periodo>inicio),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE suscripciones IS 'Contrato; cada renovación genera otra orden, no un cobro implícito.';

-- Orden de compra en una moneda; importes provienen de sus detalles.
CREATE TABLE ordenes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE, moneda char(3) NOT NULL CHECK(moneda IN ('BOB','USD')), estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','pagada','cancelada','reembolsada')), vence_en timestamptz NOT NULL, suscripcion_id uuid REFERENCES suscripciones, ciclo integer CHECK(ciclo>0), UNIQUE(suscripcion_id,ciclo), CHECK((suscripcion_id IS NULL)=(ciclo IS NULL)),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ordenes IS 'Orden de compra en una moneda; importes provienen de sus detalles.';

-- Snapshot del precio y duración: cambios de plan no cambian compras.
CREATE TABLE orden_detalles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
orden_id uuid NOT NULL REFERENCES ordenes, plan_id uuid NOT NULL REFERENCES planes_acceso, descripcion text NOT NULL, precio dinero NOT NULL, descuento dinero NOT NULL DEFAULT 0, dias_acceso integer NOT NULL CHECK(dias_acceso>0), CHECK(descuento<=precio), UNIQUE(orden_id,plan_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE orden_detalles IS 'Snapshot del precio y duración: cambios de plan no cambian compras.';

-- Snapshot de módulos comprados, separado del plan mutable.
CREATE TABLE orden_detalle_modulos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
detalle_id uuid NOT NULL REFERENCES orden_detalles, curso_id uuid NOT NULL REFERENCES cursos, modulo_id uuid NOT NULL, FOREIGN KEY(modulo_id,curso_id) REFERENCES modulos(id,curso_id), UNIQUE(detalle_id,modulo_id), UNIQUE(id,curso_id,modulo_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE orden_detalle_modulos IS 'Snapshot de módulos comprados, separado del plan mutable.';

-- Configuración no secreta del banco/proveedor; claves fuera de la BD.
CREATE TABLE proveedores_pago (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
codigo text NOT NULL UNIQUE, nombre text NOT NULL, automatico boolean NOT NULL DEFAULT false, activo boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE proveedores_pago IS 'Configuración no secreta del banco/proveedor; claves fuera de la BD.';

-- Bandeja idempotente de webhooks verificados por el backend.
CREATE TABLE eventos_pago (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
proveedor_id uuid NOT NULL REFERENCES proveedores_pago, evento_externo text NOT NULL, firma_validada boolean NOT NULL DEFAULT false, recibido_en timestamptz NOT NULL DEFAULT now(), procesado_en timestamptz, error text, UNIQUE(proveedor_id,evento_externo),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE eventos_pago IS 'Bandeja idempotente de webhooks verificados por el backend.';

-- Intentos de pago; se admite un pago confirmado completo por orden.
CREATE TABLE pagos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
orden_id uuid NOT NULL REFERENCES ordenes, proveedor_id uuid NOT NULL REFERENCES proveedores_pago,
 referencia_externa text NOT NULL, evento_id uuid UNIQUE REFERENCES eventos_pago,
 metodo text NOT NULL CHECK(metodo IN ('qr','transferencia','cortesia')),
 monto dinero NOT NULL, moneda char(3) NOT NULL CHECK(moneda IN ('BOB','USD')),
 estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','confirmado','fallido')),
 confirmado_en timestamptz, confirmado_por uuid REFERENCES usuarios,
 UNIQUE(proveedor_id,referencia_externa), CHECK(estado<>'confirmado' OR confirmado_en IS NOT NULL),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pagos IS 'Intentos de pago; se admite un pago confirmado completo por orden.';

-- Comprobante privado, visible a su dueño y personal autorizado.
CREATE TABLE comprobantes_pago (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
pago_id uuid NOT NULL REFERENCES pagos, archivo_id uuid NOT NULL REFERENCES archivos, subido_por uuid NOT NULL REFERENCES usuarios, observacion text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE comprobantes_pago IS 'Comprobante privado, visible a su dueño y personal autorizado.';

-- Devoluciones registradas por función con control de saldo concurrente.
CREATE TABLE reembolsos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
pago_id uuid NOT NULL REFERENCES pagos, monto dinero NOT NULL CHECK(monto>0), referencia text NOT NULL UNIQUE, motivo text NOT NULL, responsable_id uuid NOT NULL REFERENCES usuarios, confirmado_en timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE reembolsos IS 'Devoluciones registradas por función con control de saldo concurrente.';

-- Relación estudiante-curso; acceso efectivo depende además de concesiones y vigencia.
CREATE TABLE inscripciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
estudiante_id uuid NOT NULL REFERENCES usuarios, curso_id uuid NOT NULL REFERENCES cursos, estado text NOT NULL DEFAULT 'activa' CHECK(estado IN ('activa','suspendida','abandonada','cancelada')), inscrito_en timestamptz NOT NULL DEFAULT now(), abandono_en timestamptz, motivo text, UNIQUE(estudiante_id,curso_id), UNIQUE(id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE inscripciones IS 'Relación estudiante-curso; acceso efectivo depende además de concesiones y vigencia.';

-- Derechos temporales de compra o cortesía; una renovación añade otra fila.
CREATE TABLE accesos_modulo (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
inscripcion_id uuid NOT NULL, curso_id uuid NOT NULL, modulo_id uuid NOT NULL,
 origen_compra_id uuid REFERENCES orden_detalle_modulos, autorizado_por uuid REFERENCES usuarios, motivo text,
 desde timestamptz NOT NULL, hasta timestamptz NOT NULL, revocado_en timestamptz,
 FOREIGN KEY(inscripcion_id,curso_id) REFERENCES inscripciones(id,curso_id),
 FOREIGN KEY(modulo_id,curso_id) REFERENCES modulos(id,curso_id),
 CHECK(hasta>desde), CHECK((origen_compra_id IS NOT NULL AND autorizado_por IS NULL) OR
 (origen_compra_id IS NULL AND autorizado_por IS NOT NULL AND motivo IS NOT NULL)),
 UNIQUE(origen_compra_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE accesos_modulo IS 'Derechos temporales de compra o cortesía; una renovación añade otra fila.';

-- Avance persistente por lección; nunca mezcla cursos diferentes.
CREATE TABLE progreso_lecciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
inscripcion_id uuid NOT NULL, curso_id uuid NOT NULL, leccion_id uuid NOT NULL,
 segundos_vistos integer NOT NULL DEFAULT 0 CHECK(segundos_vistos>=0), iniciado_en timestamptz NOT NULL DEFAULT now(), completado_en timestamptz,
 FOREIGN KEY(inscripcion_id,curso_id) REFERENCES inscripciones(id,curso_id),
 FOREIGN KEY(leccion_id,curso_id) REFERENCES lecciones(id,curso_id),
 CHECK(completado_en IS NULL OR completado_en>=iniciado_en), UNIQUE(inscripcion_id,leccion_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE progreso_lecciones IS 'Avance persistente por lección; nunca mezcla cursos diferentes.';

-- Eventos de acceso para actividad y análisis; aplicar retención.
CREATE TABLE historial_acceso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, leccion_id uuid NOT NULL REFERENCES lecciones, evento text NOT NULL CHECK(evento IN ('abrir','reproducir','completar')), ocurrido_en timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE historial_acceso IS 'Eventos de acceso para actividad y análisis; aplicar retención.';

-- Diagnóstico level test y exámenes de módulo; no confundir con requisito de acceso.
CREATE TABLE evaluaciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, modulo_id uuid, titulo text NOT NULL,
 tipo text NOT NULL CHECK(tipo IN ('diagnostico','modulo')), publicada boolean NOT NULL DEFAULT false,
 nota_minima nota_100 NOT NULL DEFAULT 60, intentos_maximos integer NOT NULL DEFAULT 3 CHECK(intentos_maximos>0),
 duracion_minutos integer NOT NULL CHECK(duracion_minutos>0),
 FOREIGN KEY(modulo_id,curso_id) REFERENCES modulos(id,curso_id),
 CHECK((tipo='diagnostico' AND modulo_id IS NULL) OR (tipo='modulo' AND modulo_id IS NOT NULL)), UNIQUE(id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE evaluaciones IS 'Diagnóstico level test y exámenes de módulo; no confundir con requisito de acceso.';

-- Banco reutilizable de preguntas de la edición del curso.
CREATE TABLE preguntas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, tipo text NOT NULL CHECK(tipo IN ('unica','multiple','verdadero_falso','texto')), enunciado text NOT NULL, explicacion text, UNIQUE(id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE preguntas IS 'Banco reutilizable de preguntas de la edición del curso.';

-- Opciones y clave correcta; no exponer es_correcta al estudiante.
CREATE TABLE opciones_pregunta (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
pregunta_id uuid NOT NULL REFERENCES preguntas, texto text NOT NULL, es_correcta boolean NOT NULL DEFAULT false, orden integer NOT NULL CHECK(orden>0), UNIQUE(pregunta_id,orden), UNIQUE(id,pregunta_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE opciones_pregunta IS 'Opciones y clave correcta; no exponer es_correcta al estudiante.';

-- Pregunta asignada a evaluación con peso y orden.
CREATE TABLE evaluacion_preguntas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
evaluacion_id uuid NOT NULL, curso_id uuid NOT NULL, pregunta_id uuid NOT NULL, puntaje numeric(7,2) NOT NULL CHECK(puntaje>0), orden integer NOT NULL CHECK(orden>0), FOREIGN KEY(evaluacion_id,curso_id) REFERENCES evaluaciones(id,curso_id), FOREIGN KEY(pregunta_id,curso_id) REFERENCES preguntas(id,curso_id), UNIQUE(evaluacion_id,pregunta_id), UNIQUE(evaluacion_id,orden),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE evaluacion_preguntas IS 'Pregunta asignada a evaluación con peso y orden.';

-- Intento numerado bajo bloqueo; conserva nota y marcas de tiempo.
CREATE TABLE intentos_evaluacion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
evaluacion_id uuid NOT NULL, inscripcion_id uuid NOT NULL, curso_id uuid NOT NULL,
 numero integer NOT NULL CHECK(numero>0), iniciado_en timestamptz NOT NULL DEFAULT now(), vence_en timestamptz NOT NULL,
 entregado_en timestamptz, calificado_en timestamptz, nota nota_100,
 estado text NOT NULL DEFAULT 'en_curso' CHECK(estado IN ('en_curso','entregado','calificado','anulado')),
 FOREIGN KEY(evaluacion_id,curso_id) REFERENCES evaluaciones(id,curso_id), FOREIGN KEY(inscripcion_id,curso_id) REFERENCES inscripciones(id,curso_id),
 CHECK(vence_en>iniciado_en), CHECK(estado NOT IN ('entregado','calificado') OR entregado_en IS NOT NULL),
 CHECK(estado<>'calificado' OR (nota IS NOT NULL AND calificado_en IS NOT NULL)),
 UNIQUE(evaluacion_id,inscripcion_id,numero), UNIQUE(id,evaluacion_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE intentos_evaluacion IS 'Intento numerado bajo bloqueo; conserva nota y marcas de tiempo.';

-- Respuesta a una pregunta incluida en el examen, con snapshot del enunciado.
CREATE TABLE respuestas_estudiante (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
intento_id uuid NOT NULL, evaluacion_id uuid NOT NULL, pregunta_id uuid NOT NULL, enunciado_snapshot text NOT NULL, texto text, puntaje_obtenido numeric(7,2) CHECK(puntaje_obtenido>=0), FOREIGN KEY(intento_id,evaluacion_id) REFERENCES intentos_evaluacion(id,evaluacion_id), FOREIGN KEY(evaluacion_id,pregunta_id) REFERENCES evaluacion_preguntas(evaluacion_id,pregunta_id), UNIQUE(intento_id,pregunta_id), UNIQUE(id,pregunta_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE respuestas_estudiante IS 'Respuesta a una pregunta incluida en el examen, con snapshot del enunciado.';

-- Selección múltiple; ninguna opción puede pertenecer a otra pregunta.
CREATE TABLE respuesta_opciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
respuesta_id uuid NOT NULL, pregunta_id uuid NOT NULL, opcion_id uuid NOT NULL, texto_snapshot text NOT NULL, FOREIGN KEY(respuesta_id,pregunta_id) REFERENCES respuestas_estudiante(id,pregunta_id), FOREIGN KEY(opcion_id,pregunta_id) REFERENCES opciones_pregunta(id,pregunta_id), UNIQUE(respuesta_id,opcion_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE respuesta_opciones IS 'Selección múltiple; ninguna opción puede pertenecer a otra pregunta.';

-- Trabajos por módulo con fecha límite.
CREATE TABLE tareas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, modulo_id uuid NOT NULL, titulo text NOT NULL, instrucciones text NOT NULL, fecha_limite timestamptz NOT NULL, admite_tardia boolean NOT NULL DEFAULT false, max_entregas integer NOT NULL DEFAULT 2 CHECK(max_entregas>0), FOREIGN KEY(modulo_id,curso_id) REFERENCES modulos(id,curso_id), UNIQUE(id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tareas IS 'Trabajos por módulo con fecha límite.';

-- Repositorio de versiones de trabajos entregados.
CREATE TABLE entregas_tarea (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
tarea_id uuid NOT NULL, curso_id uuid NOT NULL, inscripcion_id uuid NOT NULL, numero integer NOT NULL CHECK(numero>0), texto text, entregado_en timestamptz NOT NULL DEFAULT now(), nota nota_100, calificado_por uuid REFERENCES usuarios, calificado_en timestamptz, FOREIGN KEY(tarea_id,curso_id) REFERENCES tareas(id,curso_id), FOREIGN KEY(inscripcion_id,curso_id) REFERENCES inscripciones(id,curso_id), UNIQUE(tarea_id,inscripcion_id,numero), CHECK(nota IS NULL OR (calificado_por IS NOT NULL AND calificado_en IS NOT NULL)),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE entregas_tarea IS 'Repositorio de versiones de trabajos entregados.';

-- Archivos privados de cada entrega.
CREATE TABLE archivos_entrega (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
entrega_id uuid NOT NULL REFERENCES entregas_tarea, archivo_id uuid NOT NULL REFERENCES archivos, UNIQUE(entrega_id,archivo_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE archivos_entrega IS 'Archivos privados de cada entrega.';

-- Devoluciones docentes sobre trabajos.
CREATE TABLE retroalimentaciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
entrega_id uuid NOT NULL REFERENCES entregas_tarea, docente_id uuid NOT NULL REFERENCES usuarios, comentario text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE retroalimentaciones IS 'Devoluciones docentes sobre trabajos.';

-- Programación Meet/Zoom y duración real separada de la prevista.
CREATE TABLE sesiones_clase (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, modulo_id uuid NOT NULL, docente_id uuid NOT NULL,
 titulo text NOT NULL, plataforma text NOT NULL CHECK(plataforma IN ('meet','zoom')),
 enlace_privado text NOT NULL, inicia_en timestamptz NOT NULL, termina_en timestamptz NOT NULL,
 inicio_real timestamptz, fin_real timestamptz, estado text NOT NULL CHECK(estado IN ('programada','en_curso','finalizada','cancelada')),
 FOREIGN KEY(modulo_id,curso_id) REFERENCES modulos(id,curso_id),
 FOREIGN KEY(curso_id,docente_id) REFERENCES curso_docentes(curso_id,docente_id),
 CHECK(termina_en>inicia_en), CHECK(fin_real IS NULL OR (inicio_real IS NOT NULL AND fin_real>inicio_real)),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE sesiones_clase IS 'Programación Meet/Zoom y duración real separada de la prevista.';

-- Asistencia de estudiantes y docentes; intervalos conservan reconexiones.
CREATE TABLE asistencias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
sesion_id uuid NOT NULL REFERENCES sesiones_clase, usuario_id uuid NOT NULL REFERENCES usuarios, tipo text NOT NULL CHECK(tipo IN ('estudiante','docente')), fuente text NOT NULL CHECK(fuente IN ('manual','meet','zoom')), verificado_por uuid REFERENCES usuarios, UNIQUE(sesion_id,usuario_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE asistencias IS 'Asistencia de estudiantes y docentes; intervalos conservan reconexiones.';

-- Entradas y salidas por participante; el backend debe unir intervalos superpuestos.
CREATE TABLE asistencia_intervalos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
asistencia_id uuid NOT NULL REFERENCES asistencias, entrada timestamptz NOT NULL, salida timestamptz NOT NULL, CHECK(salida>entrada),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE asistencia_intervalos IS 'Entradas y salidas por participante; el backend debe unir intervalos superpuestos.';

-- Grabaciones con acceso temporal y sin permiso de descarga por defecto.
CREATE TABLE grabaciones_clase (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
sesion_id uuid NOT NULL REFERENCES sesiones_clase, archivo_id uuid NOT NULL REFERENCES archivos, subido_por uuid NOT NULL REFERENCES usuarios, publicada boolean NOT NULL DEFAULT false, disponible_desde timestamptz NOT NULL, disponible_hasta timestamptz NOT NULL, permite_descarga boolean NOT NULL DEFAULT false, CHECK(disponible_hasta>disponible_desde),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE grabaciones_clase IS 'Grabaciones con acceso temporal y sin permiso de descarga por defecto.';

-- Versiones de plantilla, firma gráfica y texto; no implican firma digital legal.
CREATE TABLE plantillas_certificado (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL, version integer NOT NULL CHECK(version>0), archivo_id uuid REFERENCES archivos, texto_base text NOT NULL, UNIQUE(nombre,version),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE plantillas_certificado IS 'Versiones de plantilla, firma gráfica y texto; no implican firma digital legal.';

-- Repositorio verificable; datos históricos congelados y revocación.
CREATE TABLE certificados (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
inscripcion_id uuid NOT NULL UNIQUE REFERENCES inscripciones, plantilla_id uuid NOT NULL REFERENCES plantillas_certificado, codigo uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, nombre_snapshot text NOT NULL, curso_snapshot text NOT NULL, horas_snapshot numeric(7,2) NOT NULL CHECK(horas_snapshot>0), emitido_por uuid NOT NULL REFERENCES usuarios, emitido_en timestamptz NOT NULL DEFAULT now(), archivo_id uuid REFERENCES archivos, revocado_en timestamptz, motivo_revocacion text, CHECK(revocado_en IS NULL OR motivo_revocacion IS NOT NULL),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE certificados IS 'Repositorio verificable; datos históricos congelados y revocación.';

-- Preferencias por canal, con consentimiento externo separado.
CREATE TABLE preferencias_notificacion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, canal text NOT NULL CHECK(canal IN ('sistema','email','whatsapp')), habilitado boolean NOT NULL DEFAULT true, UNIQUE(usuario_id,canal),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE preferencias_notificacion IS 'Preferencias por canal, con consentimiento externo separado.';

-- Avisos internos, incluyendo vencimiento, clases y revisión.
CREATE TABLE notificaciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, tipo text NOT NULL, titulo text NOT NULL, mensaje text NOT NULL, ruta text, programada_en timestamptz NOT NULL DEFAULT now(), leida_en timestamptz, clave_deduplicacion text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE notificaciones IS 'Avisos internos, incluyendo vencimiento, clases y revisión.';

-- Cola outbox para correo y WhatsApp; un worker realiza los envíos.
CREATE TABLE envios_notificacion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
notificacion_id uuid NOT NULL REFERENCES notificaciones, canal text NOT NULL CHECK(canal IN ('email','whatsapp')), estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','enviado','fallido')), intentos integer NOT NULL DEFAULT 0 CHECK(intentos>=0), proximo_intento timestamptz NOT NULL DEFAULT now(), referencia_proveedor text, ultimo_error text, enviado_en timestamptz, UNIQUE(notificacion_id,canal),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE envios_notificacion IS 'Cola outbox para correo y WhatsApp; un worker realiza los envíos.';

-- Preguntas y comentarios con respuestas del mismo curso.
CREATE TABLE comentarios_curso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
curso_id uuid NOT NULL REFERENCES cursos, usuario_id uuid NOT NULL REFERENCES usuarios, padre_id uuid, texto text NOT NULL, visible boolean NOT NULL DEFAULT true, UNIQUE(id,curso_id), FOREIGN KEY(padre_id,curso_id) REFERENCES comentarios_curso(id,curso_id), CHECK(padre_id IS NULL OR padre_id<>id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE comentarios_curso IS 'Preguntas y comentarios con respuestas del mismo curso.';

-- Una valoración por inscripción, de 1 a 5 estrellas.
CREATE TABLE valoraciones_curso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
inscripcion_id uuid NOT NULL UNIQUE REFERENCES inscripciones, estrellas integer NOT NULL CHECK(estrellas BETWEEN 1 AND 5), comentario text, publicada boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE valoraciones_curso IS 'Una valoración por inscripción, de 1 a 5 estrellas.';

-- Cursos guardados por cada usuario.
CREATE TABLE favoritos_curso (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
usuario_id uuid NOT NULL REFERENCES usuarios, curso_id uuid NOT NULL REFERENCES cursos, UNIQUE(usuario_id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE favoritos_curso IS 'Cursos guardados por cada usuario.';

-- Contenido administrable para inicio, nosotros y contacto.
CREATE TABLE paginas_publicas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
slug text NOT NULL UNIQUE, titulo text NOT NULL, contenido text NOT NULL, publicada boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE paginas_publicas IS 'Contenido administrable para inicio, nosotros y contacto.';

-- FAQ pública administrable.
CREATE TABLE preguntas_frecuentes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
pregunta text NOT NULL, respuesta text NOT NULL, orden integer NOT NULL CHECK(orden>0), publicada boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE preguntas_frecuentes IS 'FAQ pública administrable.';

-- Mensajes recibidos por el formulario público.
CREATE TABLE solicitudes_contacto (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL, email citext NOT NULL, mensaje text NOT NULL, estado text NOT NULL DEFAULT 'nuevo' CHECK(estado IN ('nuevo','atendido','cerrado')), asignado_a uuid REFERENCES usuarios,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE solicitudes_contacto IS 'Mensajes recibidos por el formulario público.';

-- Parámetros públicos o internos no secretos y versionables por auditoría.
CREATE TABLE configuraciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
clave text NOT NULL UNIQUE, valor jsonb NOT NULL, descripcion text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE configuraciones IS 'Parámetros públicos o internos no secretos y versionables por auditoría.';

-- Registro de modelos y reglas; el seed NO representa una red entrenada.
CREATE TABLE modelos_recomendacion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL, version text NOT NULL, tipo text NOT NULL CHECK(tipo IN ('reglas','red_neuronal')), metricas jsonb NOT NULL DEFAULT '{}', artefacto_clave text, entrenado_en timestamptz, activo boolean NOT NULL DEFAULT false, UNIQUE(nombre,version),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE modelos_recomendacion IS 'Registro de modelos y reglas; el seed NO representa una red entrenada.';

-- Sugerencias de lecciones explicadas y basadas en desempeño.
CREATE TABLE recomendaciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
inscripcion_id uuid NOT NULL, curso_id uuid NOT NULL, leccion_id uuid NOT NULL, modelo_id uuid NOT NULL REFERENCES modelos_recomendacion, motivo text NOT NULL, puntuacion numeric(6,5) CHECK(puntuacion BETWEEN 0 AND 1), vista_en timestamptz, aceptada_en timestamptz, FOREIGN KEY(inscripcion_id,curso_id) REFERENCES inscripciones(id,curso_id), FOREIGN KEY(leccion_id,curso_id) REFERENCES lecciones(id,curso_id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE recomendaciones IS 'Sugerencias de lecciones explicadas y basadas en desempeño.';

-- Registro append-only sin contraseñas, tokens ni contenido sensible.
CREATE TABLE auditoria (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
actor_id uuid REFERENCES usuarios, transaccion bigint NOT NULL DEFAULT txid_current(), tabla text NOT NULL, registro_id uuid NOT NULL, accion text NOT NULL, campos text[] NOT NULL, ocurrido_en timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE auditoria IS 'Registro append-only sin contraseñas, tokens ni contenido sensible.';


-- Índices parciales y de consulta.
CREATE UNIQUE INDEX un_docente_principal ON curso_docentes(curso_id) WHERE principal;
CREATE UNIQUE INDEX una_version_biblioteca ON biblioteca_versiones(item_id) WHERE vigente;
CREATE UNIQUE INDEX un_pago_confirmado ON pagos(orden_id) WHERE estado='confirmado';
CREATE UNIQUE INDEX un_intento_abierto ON intentos_evaluacion(evaluacion_id,inscripcion_id) WHERE estado='en_curso';
CREATE INDEX acceso_vigencia ON accesos_modulo(inscripcion_id,modulo_id,hasta) WHERE revocado_en IS NULL;
CREATE INDEX avisos_pendientes ON notificaciones(usuario_id,programada_en) WHERE leida_en IS NULL;
CREATE INDEX outbox_pendiente ON envios_notificacion(proximo_intento) WHERE estado<>'enviado';
CREATE INDEX curso_busqueda ON cursos USING gin(to_tsvector('spanish',titulo || ' ' || descripcion));
CREATE INDEX auditoria_fecha ON auditoria(ocurrido_en);
CREATE INDEX clases_agenda ON sesiones_clase(curso_id,inicia_en);
-- Índice sobre cada FK (incluidas las compuestas), para joins y validación de referencias.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT c.conrelid::regclass tabla,c.conname,string_agg(quote_ident(a.attname),',' ORDER BY k.ord) cols
 FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
 JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
 WHERE c.contype='f' AND c.connamespace='lms'::regnamespace
 GROUP BY c.conrelid,c.conname LOOP
 EXECUTE format('CREATE INDEX %I ON %s (%s)', 'fk_'||substr(md5(r.tabla::text||r.conname),1,20),r.tabla,r.cols);
 END LOOP;
END $$;

CREATE FUNCTION tocar_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='lms' LOOP
 EXECUTE format('CREATE TRIGGER actualizar_fecha BEFORE UPDATE ON lms.%I FOR EACH ROW EXECUTE FUNCTION lms.tocar_updated_at()',r.tablename);
 END LOOP;
END $$;

CREATE FUNCTION auditar() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE j jsonb; campos text[]; BEGIN
 j=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 SELECT array_agg(key ORDER BY key) INTO campos FROM jsonb_object_keys(j) key
 WHERE key NOT IN ('password_hash','token_hash') AND (TG_OP<>'UPDATE' OR j->key IS DISTINCT FROM to_jsonb(OLD)->key);
 INSERT INTO auditoria(actor_id,tabla,registro_id,accion,campos)
 VALUES(nullif(current_setting('app.actor_id',true),'')::uuid,TG_TABLE_NAME,(j->>'id')::uuid,TG_OP,coalesce(campos,'{}'));
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['usuarios','usuario_roles','rol_permisos','cursos','revisiones_contenido','inscripciones','accesos_modulo','pagos','reembolsos','certificados','configuraciones'] LOOP
 EXECUTE format('CREATE TRIGGER auditar_cambio AFTER INSERT OR UPDATE OR DELETE ON lms.%I FOR EACH ROW EXECUTE FUNCTION lms.auditar()',n);
 END LOOP;
END $$;
CREATE FUNCTION prohibir_cambio() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Registro histórico: operación % no permitida en %',TG_OP,TG_TABLE_NAME; END $$;
CREATE TRIGGER auditoria_inmutable BEFORE UPDATE OR DELETE ON auditoria FOR EACH ROW EXECUTE FUNCTION prohibir_cambio();
CREATE TRIGGER reembolso_inmutable BEFORE UPDATE OR DELETE ON reembolsos FOR EACH ROW EXECUTE FUNCTION prohibir_cambio();
CREATE TRIGGER pagos_no_borrar BEFORE DELETE ON pagos FOR EACH ROW EXECUTE FUNCTION prohibir_cambio();
CREATE TRIGGER ordenes_no_borrar BEFORE DELETE ON ordenes FOR EACH ROW EXECUTE FUNCTION prohibir_cambio();

CREATE FUNCTION evitar_ciclo_curso() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
BEGIN
 -- Serializa cambios de prerrequisitos, incluso para inserciones concurrentes.
 PERFORM pg_advisory_xact_lock(712409);
 IF EXISTS(WITH RECURSIVE ruta(id) AS (
 SELECT NEW.requerido_id UNION SELECT p.requerido_id FROM prerrequisitos_curso p JOIN ruta r ON p.curso_id=r.id WHERE p.id<>NEW.id)
 SELECT 1 FROM ruta WHERE id=NEW.curso_id) THEN RAISE EXCEPTION 'Prerrequisitos cíclicos'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_ciclo BEFORE INSERT OR UPDATE ON prerrequisitos_curso FOR EACH ROW EXECUTE FUNCTION evitar_ciclo_curso();

CREATE VIEW v_totales_orden AS
SELECT o.id orden_id,o.numero,o.usuario_id,o.moneda,o.estado,
 coalesce(sum(d.precio-d.descuento),0)::numeric(14,2) total
FROM ordenes o LEFT JOIN orden_detalles d ON d.orden_id=o.id GROUP BY o.id;

CREATE VIEW v_progreso_modulos AS
SELECT i.id inscripcion_id,m.curso_id,m.id modulo_id,m.orden,m.titulo,
 count(l.id) lecciones_requeridas,
 count(p.id) FILTER(WHERE p.completado_en IS NOT NULL) lecciones_completadas,
 CASE WHEN count(l.id)=0 THEN 0::numeric ELSE round(100.0*count(p.id) FILTER(WHERE p.completado_en IS NOT NULL)/count(l.id),2) END porcentaje
FROM inscripciones i JOIN modulos m ON m.curso_id=i.curso_id AND m.publicado
LEFT JOIN lecciones l ON l.modulo_id=m.id AND l.publicada AND l.obligatoria
LEFT JOIN progreso_lecciones p ON p.inscripcion_id=i.id AND p.leccion_id=l.id
GROUP BY i.id,m.id;

CREATE FUNCTION modulo_completado(p_ins uuid,p_mod uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=lms,public AS $$
SELECT coalesce((SELECT
 (NOT r.completar_lecciones OR (v.lecciones_requeridas>0 AND v.lecciones_completadas=v.lecciones_requeridas))
 AND (NOT r.presentar_examen OR (
 EXISTS(SELECT 1 FROM evaluaciones e WHERE e.modulo_id=p_mod AND e.publicada AND e.tipo='modulo')
 AND NOT EXISTS(SELECT 1 FROM evaluaciones e WHERE e.modulo_id=p_mod AND e.publicada AND e.tipo='modulo'
 AND NOT EXISTS(SELECT 1 FROM intentos_evaluacion it WHERE it.evaluacion_id=e.id AND it.inscripcion_id=p_ins
 AND it.estado IN ('entregado','calificado') AND (NOT r.aprobar_examen OR (it.estado='calificado' AND it.nota>=greatest(r.nota_minima,e.nota_minima)))))))
 FROM v_progreso_modulos v JOIN reglas_curso r ON r.curso_id=v.curso_id
 WHERE v.inscripcion_id=p_ins AND v.modulo_id=p_mod),false);
$$;
CREATE FUNCTION curso_completado(p_ins uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=lms,public AS $$
SELECT EXISTS(SELECT 1 FROM v_progreso_modulos WHERE inscripcion_id=p_ins)
 AND NOT EXISTS(SELECT 1 FROM v_progreso_modulos WHERE inscripcion_id=p_ins AND NOT modulo_completado(p_ins,modulo_id));
$$;
CREATE FUNCTION puede_acceder_modulo(p_usuario uuid,p_mod uuid,p_fecha timestamptz DEFAULT now()) RETURNS boolean
LANGUAGE sql STABLE SET search_path=lms,public AS $$
SELECT EXISTS(
 SELECT 1 FROM usuarios u JOIN inscripciones i ON i.estudiante_id=u.id JOIN modulos m ON m.curso_id=i.curso_id
 JOIN cursos c ON c.id=m.curso_id
 WHERE u.id=p_usuario AND u.estado='aprobado' AND i.estado='activa' AND m.id=p_mod AND m.publicado AND c.estado='publicado'
 AND EXISTS(SELECT 1 FROM accesos_modulo a WHERE a.inscripcion_id=i.id AND a.modulo_id=m.id AND a.revocado_en IS NULL AND p_fecha>=a.desde AND p_fecha<a.hasta)
 AND NOT EXISTS(SELECT 1 FROM modulos prev WHERE prev.curso_id=m.curso_id AND prev.publicado AND prev.orden<m.orden AND NOT modulo_completado(i.id,prev.id))
 AND NOT EXISTS(SELECT 1 FROM prerrequisitos_curso pr WHERE pr.curso_id=m.curso_id
 AND NOT EXISTS(SELECT 1 FROM inscripciones ip WHERE ip.estudiante_id=u.id AND ip.curso_id=pr.requerido_id AND curso_completado(ip.id)))
);
$$;
CREATE FUNCTION puede_ver_grabacion(p_usuario uuid,p_grab uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=lms,public AS $$
SELECT EXISTS(SELECT 1 FROM grabaciones_clase g JOIN sesiones_clase s ON s.id=g.sesion_id JOIN archivos a ON a.id=g.archivo_id
 WHERE g.id=p_grab AND g.publicada AND a.escaneo='limpio' AND now()>=g.disponible_desde AND now()<g.disponible_hasta AND puede_acceder_modulo(p_usuario,s.modulo_id));
$$;
CREATE FUNCTION puede_ver_biblioteca(p_usuario uuid,p_item uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=lms,public AS $$
SELECT EXISTS(SELECT 1 FROM biblioteca_items b JOIN modulo_biblioteca mb ON mb.item_id=b.id
 WHERE b.id=p_item AND b.publicado AND puede_acceder_modulo(p_usuario,mb.modulo_id));
$$;
CREATE FUNCTION puede_ver_recurso(p_usuario uuid,p_recurso uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=lms,public AS $$
SELECT EXISTS(SELECT 1 FROM recursos_leccion r JOIN lecciones l ON l.id=r.leccion_id JOIN archivos a ON a.id=r.archivo_id
 WHERE r.id=p_recurso AND l.publicada AND a.escaneo='limpio'
 AND (r.disponible_desde IS NULL OR now()>=r.disponible_desde) AND (r.disponible_hasta IS NULL OR now()<r.disponible_hasta)
 AND EXISTS(SELECT 1 FROM revisiones_contenido rc WHERE rc.recurso_id=r.id AND rc.estado='aprobado'
 AND rc.created_at=(SELECT max(rc2.created_at) FROM revisiones_contenido rc2 WHERE rc2.recurso_id=r.id))
 AND puede_acceder_modulo(p_usuario,l.modulo_id));
$$;

CREATE FUNCTION registrar_progreso(p_ins uuid,p_leccion uuid,p_segundos integer,p_completar boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE i inscripciones; l lecciones; BEGIN
 SELECT * INTO STRICT i FROM inscripciones WHERE id=p_ins FOR UPDATE;
 SELECT * INTO STRICT l FROM lecciones WHERE id=p_leccion;
 IF i.curso_id<>l.curso_id OR NOT l.publicada OR NOT puede_acceder_modulo(i.estudiante_id,l.modulo_id) THEN RAISE EXCEPTION 'Sin acceso a la lección'; END IF;
 IF p_segundos<0 THEN RAISE EXCEPTION 'Tiempo inválido'; END IF;
 INSERT INTO progreso_lecciones(inscripcion_id,curso_id,leccion_id,segundos_vistos,completado_en)
 VALUES(i.id,i.curso_id,l.id,p_segundos,CASE WHEN p_completar THEN now() END)
 ON CONFLICT(inscripcion_id,leccion_id) DO UPDATE SET segundos_vistos=greatest(progreso_lecciones.segundos_vistos,excluded.segundos_vistos),
 completado_en=coalesce(progreso_lecciones.completado_en,excluded.completado_en);
END $$;

CREATE FUNCTION iniciar_intento(p_ins uuid,p_eval uuid) RETURNS uuid LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE i inscripciones; e evaluaciones; n integer; resultado uuid; BEGIN
 SELECT * INTO STRICT i FROM inscripciones WHERE id=p_ins FOR UPDATE;
 SELECT * INTO STRICT e FROM evaluaciones WHERE id=p_eval;
 IF i.curso_id<>e.curso_id OR NOT e.publicada OR i.estado<>'activa' OR NOT EXISTS(SELECT 1 FROM usuarios WHERE id=i.estudiante_id AND estado='aprobado') THEN RAISE EXCEPTION 'Evaluación no disponible'; END IF;
 IF e.tipo='modulo' AND NOT puede_acceder_modulo(i.estudiante_id,e.modulo_id) THEN RAISE EXCEPTION 'Módulo bloqueado'; END IF;
 IF e.tipo='diagnostico' AND NOT EXISTS(SELECT 1 FROM accesos_modulo WHERE inscripcion_id=i.id AND revocado_en IS NULL AND now()>=desde AND now()<hasta) THEN RAISE EXCEPTION 'Sin acceso vigente'; END IF;
 SELECT coalesce(max(numero),0)+1 INTO n FROM intentos_evaluacion WHERE inscripcion_id=i.id AND evaluacion_id=e.id;
 IF n>e.intentos_maximos THEN RAISE EXCEPTION 'Límite de intentos alcanzado'; END IF;
 INSERT INTO intentos_evaluacion(evaluacion_id,inscripcion_id,curso_id,numero,vence_en)
 VALUES(e.id,i.id,i.curso_id,n,now()+make_interval(mins=>e.duracion_minutos)) RETURNING id INTO resultado;
 RETURN resultado;
END $$;

CREATE FUNCTION crear_orden(p_usuario uuid,p_planes uuid[],p_orden uuid DEFAULT gen_random_uuid()) RETURNS uuid LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE o uuid; p planes_acceso; d uuid; mon char(3); n integer; BEGIN
 IF NOT EXISTS(SELECT 1 FROM usuarios WHERE id=p_usuario AND estado='aprobado') THEN RAISE EXCEPTION 'Usuario no aprobado'; END IF;
 IF coalesce(cardinality(p_planes),0)=0 THEN RAISE EXCEPTION 'Orden vacía'; END IF;
 SELECT count(DISTINCT x) INTO n FROM unnest(p_planes) x;
 IF n<>cardinality(p_planes) THEN RAISE EXCEPTION 'Planes repetidos'; END IF;
 SELECT moneda INTO mon FROM planes_acceso WHERE id=p_planes[1];
 IF mon IS NULL THEN RAISE EXCEPTION 'Plan inexistente'; END IF;
 INSERT INTO ordenes(id,usuario_id,moneda,vence_en) VALUES(p_orden,p_usuario,mon,now()+interval '24 hours') RETURNING id INTO o;
 FOREACH d IN ARRAY p_planes LOOP
 SELECT * INTO STRICT p FROM planes_acceso WHERE id=d FOR SHARE;
 IF NOT p.activo OR p.moneda<>mon THEN RAISE EXCEPTION 'Plan inactivo o monedas mezcladas'; END IF;
 IF NOT EXISTS(SELECT 1 FROM plan_modulos WHERE plan_id=p.id) THEN RAISE EXCEPTION 'Plan sin cobertura'; END IF;
 INSERT INTO orden_detalles(orden_id,plan_id,descripcion,precio,dias_acceso) VALUES(o,p.id,p.nombre,p.precio,p.dias_acceso) RETURNING id INTO d;
 INSERT INTO orden_detalle_modulos(detalle_id,curso_id,modulo_id)
 SELECT d,m.curso_id,m.id FROM plan_modulos pm JOIN modulos m ON m.id=pm.modulo_id WHERE pm.plan_id=p.id;
 END LOOP;
 RETURN o;
END $$;

CREATE FUNCTION validar_pago_confirmado() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE o ordenes; total numeric; BEGIN
 IF TG_OP='UPDATE' AND OLD.estado='confirmado' THEN RAISE EXCEPTION 'Pago confirmado inmutable; registrar reembolso'; END IF;
 SELECT * INTO STRICT o FROM ordenes WHERE id=NEW.orden_id FOR UPDATE;
 IF NEW.estado='confirmado' THEN
 SELECT v.total INTO total FROM v_totales_orden v WHERE v.orden_id=o.id;
 IF o.estado<>'pendiente' OR o.vence_en<=now() OR NEW.moneda<>o.moneda OR NEW.monto<>total
 OR NOT EXISTS(SELECT 1 FROM orden_detalles WHERE orden_id=o.id) THEN RAISE EXCEPTION 'Orden, moneda, plazo o importe no válido'; END IF;
 IF NEW.evento_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM eventos_pago WHERE id=NEW.evento_id AND proveedor_id=NEW.proveedor_id AND firma_validada) THEN RAISE EXCEPTION 'Evento no verificado'; END IF;
 IF NEW.evento_id IS NULL AND NEW.confirmado_por IS NULL THEN RAISE EXCEPTION 'Requiere evento verificado o responsable manual'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pago_validado BEFORE INSERT OR UPDATE ON pagos FOR EACH ROW EXECUTE FUNCTION validar_pago_confirmado();

CREATE FUNCTION activar_compra() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE o ordenes; r record; ins uuid; BEGIN
 IF NEW.estado<>'confirmado' THEN RETURN NEW; END IF;
 SELECT * INTO STRICT o FROM ordenes WHERE id=NEW.orden_id;
 UPDATE ordenes SET estado='pagada' WHERE id=o.id;
 FOR r IN SELECT dm.*,d.dias_acceso FROM orden_detalles d JOIN orden_detalle_modulos dm ON dm.detalle_id=d.id WHERE d.orden_id=o.id LOOP
 INSERT INTO inscripciones(estudiante_id,curso_id) VALUES(o.usuario_id,r.curso_id)
 ON CONFLICT(estudiante_id,curso_id) DO NOTHING;
 SELECT id INTO STRICT ins FROM inscripciones WHERE estudiante_id=o.usuario_id AND curso_id=r.curso_id;
 -- No reactivar silenciosamente una inscripción suspendida o abandonada.
 INSERT INTO accesos_modulo(inscripcion_id,curso_id,modulo_id,origen_compra_id,desde,hasta)
 VALUES(ins,r.curso_id,r.modulo_id,r.id,NEW.confirmado_en,NEW.confirmado_en+make_interval(days=>r.dias_acceso));
 END LOOP;
 IF NEW.evento_id IS NOT NULL THEN UPDATE eventos_pago SET procesado_en=now() WHERE id=NEW.evento_id; END IF;
 INSERT INTO notificaciones(usuario_id,tipo,titulo,mensaje,ruta,clave_deduplicacion)
 VALUES(o.usuario_id,'pago','Pago confirmado','Tu compra ha sido registrada. Consulta tus cursos.','/estudiante/cursos','pago:'||NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER activar_pago AFTER INSERT OR UPDATE OF estado ON pagos FOR EACH ROW EXECUTE FUNCTION activar_compra();

CREATE FUNCTION validar_origen_acceso() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
BEGIN
 IF NEW.origen_compra_id IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM orden_detalle_modulos dm JOIN orden_detalles d ON d.id=dm.detalle_id JOIN ordenes o ON o.id=d.orden_id
 JOIN inscripciones i ON i.id=NEW.inscripcion_id
 WHERE dm.id=NEW.origen_compra_id AND dm.modulo_id=NEW.modulo_id AND dm.curso_id=NEW.curso_id AND o.usuario_id=i.estudiante_id AND o.estado='pagada') THEN RAISE EXCEPTION 'Compra ajena o sin confirmar'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER origen_acceso BEFORE INSERT ON accesos_modulo FOR EACH ROW EXECUTE FUNCTION validar_origen_acceso();

CREATE FUNCTION registrar_reembolso(p_pago uuid,p_monto numeric,p_ref text,p_motivo text,p_actor uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE p pagos; acum numeric; r uuid; BEGIN
 SELECT * INTO STRICT p FROM pagos WHERE id=p_pago FOR UPDATE;
 SELECT coalesce(sum(monto),0) INTO acum FROM reembolsos WHERE pago_id=p.id;
 IF p.estado<>'confirmado' OR p_monto<=0 OR acum+p_monto>p.monto THEN RAISE EXCEPTION 'Reembolso excede saldo o pago no confirmado'; END IF;
 INSERT INTO reembolsos(pago_id,monto,referencia,motivo,responsable_id) VALUES(p.id,p_monto,p_ref,p_motivo,p_actor) RETURNING id INTO r;
 IF acum+p_monto=p.monto THEN
 UPDATE accesos_modulo a SET revocado_en=now() FROM orden_detalle_modulos dm JOIN orden_detalles d ON d.id=dm.detalle_id
 WHERE a.origen_compra_id=dm.id AND d.orden_id=p.orden_id AND a.revocado_en IS NULL;
 UPDATE ordenes SET estado='reembolsada' WHERE id=p.orden_id;
 END IF;
 RETURN r;
END $$;

CREATE FUNCTION emitir_certificado(p_ins uuid,p_plantilla uuid,p_actor uuid) RETURNS uuid LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE i inscripciones; c cursos; u usuarios; r reglas_curso; resultado uuid; BEGIN
 SELECT * INTO STRICT i FROM inscripciones WHERE id=p_ins FOR UPDATE;
 SELECT * INTO STRICT c FROM cursos WHERE id=i.curso_id;
 SELECT * INTO STRICT u FROM usuarios WHERE id=i.estudiante_id;
 SELECT * INTO STRICT r FROM reglas_curso WHERE curso_id=c.id;
 IF NOT curso_completado(i.id) OR u.estado<>'aprobado' OR i.estado<>'activa' THEN RAISE EXCEPTION 'Curso no completado o cuenta/inscripción inhabilitada'; END IF;
 IF r.certificado_requiere_aprobar AND EXISTS(SELECT 1 FROM evaluaciones e WHERE e.curso_id=c.id AND e.tipo='modulo' AND e.publicada AND NOT EXISTS(
 SELECT 1 FROM intentos_evaluacion it WHERE it.inscripcion_id=i.id AND it.evaluacion_id=e.id AND it.estado='calificado' AND it.nota>=greatest(e.nota_minima,r.nota_minima))) THEN RAISE EXCEPTION 'No cumple notas para certificado'; END IF;
 INSERT INTO certificados(inscripcion_id,plantilla_id,nombre_snapshot,curso_snapshot,horas_snapshot,emitido_por)
 VALUES(i.id,p_plantilla,u.nombres||' '||u.apellidos,c.titulo,c.duracion_horas,p_actor) RETURNING id INTO resultado;
 RETURN resultado;
END $$;

CREATE VIEW v_dashboard_cursos AS
SELECT c.id curso_id,c.titulo,count(i.id) inscritos,
 count(i.id) FILTER(WHERE i.estado='activa') inscripciones_activas,
 count(i.id) FILTER(WHERE curso_completado(i.id)) completaron
FROM cursos c LEFT JOIN inscripciones i ON i.curso_id=c.id GROUP BY c.id;
CREATE VIEW v_ingresos AS
SELECT p.moneda,date_trunc('month',p.confirmado_en) mes,sum(p.monto) cobrado,
 sum(coalesce(r.total,0)) reembolsado,sum(p.monto-coalesce(r.total,0)) neto
FROM pagos p LEFT JOIN (SELECT pago_id,sum(monto) total FROM reembolsos GROUP BY pago_id) r ON r.pago_id=p.id
WHERE p.estado='confirmado' GROUP BY p.moneda,date_trunc('month',p.confirmado_en);
CREATE VIEW v_flujo_caja AS
SELECT moneda,date_trunc('month',fecha) mes,sum(importe) neto_movimientos
FROM (SELECT moneda,confirmado_en fecha,monto importe FROM pagos WHERE estado='confirmado'
UNION ALL SELECT p.moneda,r.confirmado_en,-r.monto FROM reembolsos r JOIN pagos p ON p.id=r.pago_id) x
GROUP BY moneda,date_trunc('month',fecha);
CREATE VIEW v_accesos_por_vencer AS
SELECT i.estudiante_id,a.inscripcion_id,a.modulo_id,max(a.hasta) vence_en
FROM accesos_modulo a JOIN inscripciones i ON i.id=a.inscripcion_id
WHERE a.revocado_en IS NULL AND a.hasta>now() AND a.desde<=now() AND i.estado='activa'
GROUP BY i.estudiante_id,a.inscripcion_id,a.modulo_id HAVING max(a.hasta)<=now()+interval '7 days';
CREATE VIEW v_asistencia AS
SELECT s.id sesion_id,s.titulo,a.usuario_id,a.tipo,
 coalesce(sum(extract(epoch FROM ai.salida-ai.entrada))/60,0)::numeric(10,2) minutos_conectado,
 (extract(epoch FROM s.termina_en-s.inicia_en)/60)::numeric(10,2) minutos_programados
FROM sesiones_clase s JOIN asistencias a ON a.sesion_id=s.id LEFT JOIN asistencia_intervalos ai ON ai.asistencia_id=a.id GROUP BY s.id,a.id;
CREATE VIEW v_catalogo_publico AS SELECT id,titulo,slug,descripcion,objetivos,nivel,idioma,duracion_horas,portada_url FROM cursos WHERE estado='publicado';
CREATE VIEW v_resultados_ia AS
SELECT it.id intento_id,it.inscripcion_id,it.curso_id,it.evaluacion_id,it.numero,it.nota,it.entregado_en
FROM intentos_evaluacion it JOIN inscripciones i ON i.id=it.inscripcion_id
WHERE it.estado='calificado' AND EXISTS(SELECT 1 FROM consentimientos c WHERE c.usuario_id=i.estudiante_id AND c.tipo='analitica' AND c.aceptado
AND c.registrado_en=(SELECT max(c2.registrado_en) FROM consentimientos c2 WHERE c2.usuario_id=i.estudiante_id AND c2.tipo='analitica'));

-- Integridad adicional: snapshots comerciales, entregas y calificación.
CREATE FUNCTION proteger_detalle_pagado() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE oid uuid; did uuid; st text; BEGIN
 IF TG_TABLE_NAME='orden_detalles' THEN
  oid=CASE WHEN TG_OP='INSERT' THEN NEW.orden_id ELSE OLD.orden_id END;
 ELSE
  did=CASE WHEN TG_OP='INSERT' THEN NEW.detalle_id ELSE OLD.detalle_id END;
  SELECT orden_id INTO STRICT oid FROM orden_detalles WHERE id=did;
 END IF;
 SELECT estado INTO STRICT st FROM ordenes WHERE id=oid FOR UPDATE;
 IF st<>'pendiente' THEN RAISE EXCEPTION 'Snapshot de compra cerrado'; END IF;
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='orden_detalles' AND NEW.orden_id<>OLD.orden_id THEN RAISE EXCEPTION 'No mover detalles entre órdenes'; END IF;
  IF TG_TABLE_NAME='orden_detalle_modulos' AND NEW.detalle_id<>OLD.detalle_id THEN RAISE EXCEPTION 'No mover coberturas entre detalles'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER proteger_detalles BEFORE INSERT OR UPDATE OR DELETE ON orden_detalles FOR EACH ROW EXECUTE FUNCTION proteger_detalle_pagado();
CREATE TRIGGER proteger_cobertura BEFORE INSERT OR UPDATE OR DELETE ON orden_detalle_modulos FOR EACH ROW EXECUTE FUNCTION proteger_detalle_pagado();

CREATE FUNCTION proteger_orden() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
BEGIN
 IF NEW.usuario_id<>OLD.usuario_id OR NEW.moneda<>OLD.moneda OR NEW.id<>OLD.id THEN RAISE EXCEPTION 'Identidad de orden inmutable'; END IF;
 IF OLD.estado<>'pendiente' AND (NEW.vence_en<>OLD.vence_en) THEN RAISE EXCEPTION 'Orden cerrada'; END IF;
 IF NEW.estado<>OLD.estado AND NOT ((OLD.estado='pendiente' AND NEW.estado IN ('pagada','cancelada')) OR (OLD.estado='pagada' AND NEW.estado='reembolsada')) THEN RAISE EXCEPTION 'Transición de orden inválida'; END IF;
 IF NEW.estado='pagada' AND NOT EXISTS(SELECT 1 FROM pagos WHERE orden_id=NEW.id AND estado='confirmado') THEN RAISE EXCEPTION 'Sin pago confirmado'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER proteger_orden_update BEFORE UPDATE ON ordenes FOR EACH ROW EXECUTE FUNCTION proteger_orden();

CREATE FUNCTION verificar_reembolso() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE p pagos; total numeric; BEGIN
 SELECT * INTO STRICT p FROM pagos WHERE id=NEW.pago_id FOR UPDATE;
 SELECT coalesce(sum(monto),0) INTO total FROM reembolsos WHERE pago_id=p.id;
 IF p.estado<>'confirmado' OR total+NEW.monto>p.monto THEN RAISE EXCEPTION 'Devolución excede el pago'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER saldo_reembolso BEFORE INSERT ON reembolsos FOR EACH ROW EXECUTE FUNCTION verificar_reembolso();

CREATE FUNCTION validar_asistente() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE c uuid; BEGIN
 SELECT curso_id INTO STRICT c FROM sesiones_clase WHERE id=NEW.sesion_id;
 IF NEW.tipo='docente' THEN
  IF NOT EXISTS(SELECT 1 FROM curso_docentes WHERE curso_id=c AND docente_id=NEW.usuario_id) THEN RAISE EXCEPTION 'Docente no asignado'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM inscripciones WHERE curso_id=c AND estudiante_id=NEW.usuario_id) THEN RAISE EXCEPTION 'Estudiante no inscrito'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER asistente_curso BEFORE INSERT OR UPDATE ON asistencias FOR EACH ROW EXECUTE FUNCTION validar_asistente();

CREATE FUNCTION validar_intervalo() RETURNS trigger LANGUAGE plpgsql SET search_path=lms,public AS $$
BEGIN
 PERFORM 1 FROM asistencias WHERE id=NEW.asistencia_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM asistencia_intervalos ai WHERE ai.asistencia_id=NEW.asistencia_id AND ai.id<>NEW.id
 AND tstzrange(ai.entrada,ai.salida,'[)') && tstzrange(NEW.entrada,NEW.salida,'[)')) THEN RAISE EXCEPTION 'Intervalos de asistencia superpuestos'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER intervalo_sin_solapamiento BEFORE INSERT OR UPDATE ON asistencia_intervalos FOR EACH ROW EXECUTE FUNCTION validar_intervalo();

CREATE FUNCTION entregar_tarea(p_ins uuid,p_tarea uuid,p_texto text,p_archivos uuid[] DEFAULT '{}') RETURNS uuid
LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE i inscripciones; t tareas; n integer; resultado uuid; a uuid; BEGIN
 SELECT * INTO STRICT i FROM inscripciones WHERE id=p_ins FOR UPDATE;
 SELECT * INTO STRICT t FROM tareas WHERE id=p_tarea;
 IF i.curso_id<>t.curso_id OR NOT puede_acceder_modulo(i.estudiante_id,t.modulo_id) THEN RAISE EXCEPTION 'Sin acceso a tarea'; END IF;
 IF now()>t.fecha_limite AND NOT t.admite_tardia THEN RAISE EXCEPTION 'Plazo vencido'; END IF;
 IF nullif(trim(p_texto),'') IS NULL AND coalesce(cardinality(p_archivos),0)=0 THEN RAISE EXCEPTION 'Entrega vacía'; END IF;
 SELECT coalesce(max(numero),0)+1 INTO n FROM entregas_tarea WHERE inscripcion_id=i.id AND tarea_id=t.id;
 IF n>t.max_entregas THEN RAISE EXCEPTION 'Límite de entregas'; END IF;
 INSERT INTO entregas_tarea(tarea_id,curso_id,inscripcion_id,numero,texto) VALUES(t.id,t.curso_id,i.id,n,p_texto) RETURNING id INTO resultado;
 FOREACH a IN ARRAY coalesce(p_archivos,'{}'::uuid[]) LOOP
 IF NOT EXISTS(SELECT 1 FROM archivos WHERE id=a AND propietario_id=i.estudiante_id AND escaneo='limpio') THEN RAISE EXCEPTION 'Archivo ajeno o no revisado'; END IF;
 INSERT INTO archivos_entrega(entrega_id,archivo_id) VALUES(resultado,a);
 END LOOP;
 RETURN resultado;
END $$;

-- Respuestas JSON: [{"pregunta_id":"uuid","opciones":["uuid"],"texto":null}].
-- Puntaje automático exacto de selección; preguntas de texto requieren docente.
CREATE FUNCTION entregar_intento(p_intento uuid,p_respuestas jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE it intentos_evaluacion; i inscripciones; e evaluaciones; r jsonb; p preguntas;
 rid uuid; opcion uuid; peso numeric; puntos numeric; total numeric; obtenido numeric=0;
 hay_texto boolean=false; seleccion uuid[]; correctas uuid[]; n integer;
BEGIN
 SELECT * INTO STRICT it FROM intentos_evaluacion WHERE id=p_intento FOR UPDATE;
 SELECT * INTO STRICT i FROM inscripciones WHERE id=it.inscripcion_id;
 SELECT * INTO STRICT e FROM evaluaciones WHERE id=it.evaluacion_id;
 IF it.estado<>'en_curso' OR now()>it.vence_en THEN RAISE EXCEPTION 'Intento cerrado o tiempo agotado'; END IF;
 IF i.estado<>'activa' OR NOT EXISTS(SELECT 1 FROM usuarios WHERE id=i.estudiante_id AND estado='aprobado')
 OR (e.tipo='modulo' AND NOT puede_acceder_modulo(i.estudiante_id,e.modulo_id)) THEN RAISE EXCEPTION 'Cuenta o acceso inhabilitado'; END IF;
 IF jsonb_typeof(p_respuestas)<>'array' THEN RAISE EXCEPTION 'Formato de respuestas inválido'; END IF;
 SELECT sum(puntaje) INTO total FROM evaluacion_preguntas WHERE evaluacion_id=e.id;
 IF total IS NULL OR total=0 THEN RAISE EXCEPTION 'Examen sin preguntas'; END IF;
 -- Admite entrega parcial; las preguntas omitidas valen cero.
 FOR r IN SELECT value FROM jsonb_array_elements(p_respuestas) LOOP
 SELECT * INTO STRICT p FROM preguntas WHERE id=(r->>'pregunta_id')::uuid;
 SELECT puntaje INTO STRICT peso FROM evaluacion_preguntas WHERE evaluacion_id=e.id AND pregunta_id=p.id;
 SELECT coalesce(array_agg(v::uuid ORDER BY v::uuid),'{}'::uuid[]) INTO seleccion FROM jsonb_array_elements_text(coalesce(r->'opciones','[]'::jsonb)) v;
 SELECT count(DISTINCT x) INTO n FROM unnest(seleccion) x;
 IF n<>cardinality(seleccion) THEN RAISE EXCEPTION 'Opciones duplicadas'; END IF;
 IF p.tipo IN ('unica','verdadero_falso') AND cardinality(seleccion)>1 THEN RAISE EXCEPTION 'Se admite una opción'; END IF;
 IF p.tipo='texto' AND cardinality(seleccion)>0 THEN RAISE EXCEPTION 'Pregunta de texto no admite opciones'; END IF;
 SELECT coalesce(array_agg(id ORDER BY id),'{}'::uuid[]) INTO correctas FROM opciones_pregunta WHERE pregunta_id=p.id AND es_correcta;
 IF p.tipo<>'texto' AND cardinality(correctas)=0 THEN RAISE EXCEPTION 'Pregunta sin clave correcta'; END IF;
 IF p.tipo IN ('unica','verdadero_falso') AND cardinality(correctas)<>1 THEN RAISE EXCEPTION 'Clave de selección única inválida'; END IF;
 puntos=CASE WHEN p.tipo='texto' THEN NULL WHEN seleccion=correctas THEN peso ELSE 0 END;
 hay_texto=hay_texto OR p.tipo='texto'; obtenido=obtenido+coalesce(puntos,0);
 INSERT INTO respuestas_estudiante(intento_id,evaluacion_id,pregunta_id,enunciado_snapshot,texto,puntaje_obtenido)
 VALUES(it.id,e.id,p.id,p.enunciado,r->>'texto',puntos) RETURNING id INTO rid;
 FOREACH opcion IN ARRAY seleccion LOOP
 IF NOT EXISTS(SELECT 1 FROM opciones_pregunta WHERE id=opcion AND pregunta_id=p.id) THEN RAISE EXCEPTION 'Opción de otra pregunta'; END IF;
 INSERT INTO respuesta_opciones(respuesta_id,pregunta_id,opcion_id,texto_snapshot) SELECT rid,p.id,id,texto FROM opciones_pregunta WHERE id=opcion;
 END LOOP;
 END LOOP;
 UPDATE intentos_evaluacion SET estado=CASE WHEN hay_texto THEN 'entregado' ELSE 'calificado' END,
 entregado_en=now(),calificado_en=CASE WHEN NOT hay_texto THEN now() END,
 nota=CASE WHEN NOT hay_texto THEN round(100*obtenido/total,2) END WHERE id=it.id;
END $$;

-- El backend restringe esta función al docente asignado o al administrador.
-- [{"respuesta_id":"uuid","puntaje":0.5}]; cada peso está limitado por la evaluación.
CREATE FUNCTION calificar_texto(p_intento uuid,p_notas jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=lms,public AS $$
DECLARE it intentos_evaluacion; n jsonb; peso numeric; total numeric; obtenido numeric; BEGIN
 SELECT * INTO STRICT it FROM intentos_evaluacion WHERE id=p_intento FOR UPDATE;
 IF it.estado<>'entregado' THEN RAISE EXCEPTION 'Intento no pendiente de calificación'; END IF;
 FOR n IN SELECT value FROM jsonb_array_elements(p_notas) LOOP
 SELECT ep.puntaje INTO STRICT peso FROM respuestas_estudiante r JOIN preguntas p ON p.id=r.pregunta_id
 JOIN evaluacion_preguntas ep ON ep.evaluacion_id=r.evaluacion_id AND ep.pregunta_id=r.pregunta_id
 WHERE r.id=(n->>'respuesta_id')::uuid AND r.intento_id=it.id AND p.tipo='texto';
 IF (n->>'puntaje')::numeric NOT BETWEEN 0 AND peso THEN RAISE EXCEPTION 'Puntaje fuera de rango'; END IF;
 UPDATE respuestas_estudiante SET puntaje_obtenido=(n->>'puntaje')::numeric WHERE id=(n->>'respuesta_id')::uuid;
 END LOOP;
 IF EXISTS(SELECT 1 FROM respuestas_estudiante WHERE intento_id=it.id AND puntaje_obtenido IS NULL) THEN RAISE EXCEPTION 'Faltan respuestas por calificar'; END IF;
 SELECT sum(puntaje) INTO total FROM evaluacion_preguntas WHERE evaluacion_id=it.evaluacion_id;
 SELECT coalesce(sum(puntaje_obtenido),0) INTO obtenido FROM respuestas_estudiante WHERE intento_id=it.id;
 UPDATE intentos_evaluacion SET nota=round(100*obtenido/total,2),estado='calificado',calificado_en=now() WHERE id=it.id;
END $$;

-- Cerrar funciones a PUBLIC: el administrador debe conceder explícitamente al rol backend.
REVOKE ALL ON ALL TABLES IN SCHEMA lms FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA lms FROM PUBLIC;
REVOKE ALL ON SCHEMA lms FROM PUBLIC;
COMMIT;
