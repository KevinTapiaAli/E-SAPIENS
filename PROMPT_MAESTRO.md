# PROMPT MAESTRO — E-SAPIENS LMS

Actúa como **arquitecto de software senior, líder full-stack, especialista en seguridad de aplicaciones y DevOps**. Debes desarrollar E-SAPIENS como un producto web real destinado a producción, no como una demo académica improvisada.

## 1. Contexto del producto

E-SAPIENS es una plataforma LMS de cursos en línea. Debe permitir mostrar cursos, libros, referencias bibliográficas, clases, videos, módulos y lecciones. El acceso académico es progresivo y depende de inscripción, plan adquirido, vigencia y reglas configurables del curso.

Actores principales:

- visitante;
- estudiante;
- docente/capacitador;
- administrador;
- administrador general;
- proveedor de pagos;
- servicios externos de almacenamiento, mensajería y videoconferencia.

Requerimientos funcionales principales:

- registro de usuarios con aprobación administrativa;
- autenticación, recuperación de contraseña y verificación de correo;
- RBAC con permisos explícitos;
- catálogo público de cursos y biblioteca;
- cursos > módulos > lecciones;
- bloqueo/desbloqueo progresivo de módulos;
- progreso del estudiante;
- evaluaciones y level test;
- tareas, entregas y retroalimentación;
- clases en vivo mediante enlaces externos (Meet/Zoom inicialmente);
- grabaciones privadas con vigencia temporal;
- planes de acceso, órdenes, pagos, comprobantes y reembolsos;
- certificados verificables;
- repositorio de certificados;
- notificaciones dentro del sistema, correo y WhatsApp;
- comentarios, preguntas y valoraciones;
- dashboards para estudiante, docente y administrador;
- recomendaciones de aprendizaje; la IA real se implementará solo cuando existan objetivo, datos, consentimiento y métricas válidas;
- futura app Flutter utilizando la misma API.

## 2. Arquitectura obligatoria

Usa un **monorepo TypeScript** con `pnpm` y Turborepo, estructurado aproximadamente así:

```text
apps/
  web/       # Next.js
  api/       # NestJS REST API
  worker/    # NestJS/BullMQ workers
packages/
  contracts/ # DTOs/esquemas/contratos compartidos sin lógica de dominio
  ui/        # design system reusable
  config/    # eslint/tsconfig/prettier compartidos
infra/
database/
docs/
```

### Frontend

Usa **Next.js App Router + TypeScript estricto**. Next.js se utilizará como capa web, renderizado, SEO, routing y experiencia de usuario; **NO** será la fuente de verdad del negocio ni accederá directamente a PostgreSQL.

Organiza el frontend por features/dominios, no por carpetas gigantes de `components`, `services` y `utils` sin contexto. Ejemplo:

```text
src/
  app/
  features/
    auth/
    catalog/
    classroom/
    evaluations/
    payments/
    admin/
  entities/
  shared/
    api/
    ui/
    lib/
    config/
```

Usa Server Components para contenido público y lecturas apropiadas; Client Components solo donde haya interacción. Para estado remoto interactivo usa TanStack Query cuando aporte valor. No dupliques el estado del servidor sin necesidad.

### Backend

Usa **NestJS** como API central con arquitectura **modular + Clean Architecture pragmática**. Cada dominio debe encapsular su aplicación, dominio e infraestructura.

Ejemplo por módulo:

```text
modules/courses/
  domain/
    entities/
    value-objects/
    repositories/
    errors/
  application/
    use-cases/
    dto/
  infrastructure/
    persistence/
    mappers/
    integrations/
  presentation/
    http/
  courses.module.ts
```

No uses microservicios al inicio. Extrae un servicio únicamente cuando exista una razón verificable: carga independiente, aislamiento operacional, límites de equipo o necesidad de escalado separado.

### Worker

Las tareas lentas o reintentables deben salir del request HTTP:

- email;
- WhatsApp;
- generación de certificados PDF;
- recordatorios de vencimiento;
- procesamiento de webhooks posteriores;
- analítica no crítica;
- futuras tareas de IA;
- procesamiento multimedia cuando corresponda.

Usa BullMQ/Redis y jobs idempotentes con reintentos controlados y dead-letter strategy documentada.

## 3. Base de datos

PostgreSQL es la fuente de verdad. La base existente es valiosa y debe preservarse como punto de partida.

Reglas:

1. No reemplaces el esquema completo por modelos ORM simplificados.
2. Conserva dominios, constraints, vistas, funciones y triggers útiles mediante migraciones SQL versionadas.
3. El ORM sirve para CRUD y tipado; no debe borrar capacidades nativas de PostgreSQL.
4. Nunca uses `float` para dinero.
5. Toda operación de negocio con varios writes críticos debe ser transaccional.
6. Los clientes web/móvil nunca reciben acceso SQL directo.
7. Separa estrictamente `schema/migrations` de `seed de desarrollo`.
8. Ninguna contraseña demo o secreto puede terminar en producción.
9. Añade migraciones incrementales; no edites silenciosamente una migración ya aplicada en entornos compartidos.
10. Antes de agregar índices, identifica consultas críticas y usa `EXPLAIN (ANALYZE, BUFFERS)` en staging.

Mantén el esquema `lms` y revisa compatibilidad con PostgreSQL estable actual. Preserva `pgcrypto`, `citext`, UUIDs, `timestamptz`, restricciones y auditoría si superan pruebas.

### Mejoras de persistencia requeridas

- crear un mecanismo genérico de **inbox de webhooks** para idempotencia;
- crear un **transactional outbox** para eventos externos cuando el flujo lo requiera;
- registrar `correlation_id`/`request_id` en auditoría técnica cuando sea posible;
- definir política de retención/anonimización para datos personales;
- no agregar `deleted_at` universalmente: pagos, auditoría y certificados requieren políticas propias;
- si se mantiene bcrypt por compatibilidad, aceptar hashes existentes y migrar progresivamente a Argon2id al iniciar sesión o cambiar contraseña.

## 4. API

La API será REST versionada bajo `/api/v1`.

Requisitos:

- OpenAPI/Swagger actualizado desde el código;
- DTOs validados en la entrada;
- respuestas y errores consistentes;
- paginación cursor-based para colecciones grandes;
- filtros y ordenamiento con whitelist;
- idempotency keys en endpoints de compra/pago que lo necesiten;
- webhooks autenticados/verificados;
- `X-Request-Id` o correlation ID;
- no aceptar `usuario_id`, `rol`, `precio`, `nota`, `permisos` u otros valores sensibles del navegador como autoridad;
- autorización por rol + permiso + propiedad/recurso;
- no filtrar secretos, hashes ni datos de otros usuarios.

Formato de error recomendado:

```json
{
  "error": {
    "code": "COURSE_ACCESS_EXPIRED",
    "message": "El acceso a este módulo venció.",
    "details": {},
    "requestId": "..."
  }
}
```

## 5. Seguridad obligatoria

Implementa seguridad desde el primer sprint:

- HTTPS en producción;
- cookies `HttpOnly`, `Secure` y política `SameSite` apropiada para la web;
- estrategia separada y segura para tokens móviles;
- Argon2id para nuevas contraseñas o plan documentado de migración desde bcrypt;
- rotación/revocación de sesiones;
- recuperación de contraseña con tokens de un solo uso, hash y vencimiento;
- rate limiting por endpoint sensible;
- protección CSRF si la autenticación web usa cookies;
- CORS con allowlist, nunca `*` con credenciales;
- headers seguros/Helmet;
- validación de MIME, tamaño y extensión para uploads;
- antivirus/escaneo cuando se habiliten archivos de usuarios en producción;
- secretos solo en Secret Manager/variables de entorno, jamás Git;
- auditoría de operaciones administrativas y financieras;
- principio de mínimo privilegio para la cuenta PostgreSQL del backend;
- SAST, dependency audit y secret scanning en CI.

### Video y archivos privados

No prometas “imposible descargar”. Eso no existe para contenido reproducible por el usuario. Implementa mitigación profesional:

- bucket S3 privado;
- acceso únicamente mediante CloudFront;
- Origin Access Control;
- HLS para video cuando corresponda;
- signed cookies para conjuntos de segmentos HLS o signed URLs para objetos individuales;
- expiraciones breves y autorización previa en NestJS;
- watermark opcional con identidad del usuario en contenido sensible;
- nunca guardar URLs firmadas en PostgreSQL.

## 6. Pagos

Implementa el dominio de pagos mediante un **PaymentProvider port/adaptor**. No acoples el core a un banco o proveedor QR concreto.

Flujo:

1. crear orden con snapshot de precio/cobertura;
2. iniciar pago;
3. recibir webhook del proveedor;
4. verificar firma/origen;
5. guardar evento en inbox con referencia única;
6. procesar idempotentemente;
7. confirmar pago + conceder acceso en una transacción local;
8. emitir evento outbox para notificación/recibo.

Si el proveedor no soporta confirmación automática, implementar un flujo manual claramente separado; no simular automatización.

## 7. Observabilidad

Desde staging:

- logs JSON estructurados;
- request/correlation ID;
- métricas de latencia, errores y throughput;
- trazas OpenTelemetry donde aporte valor;
- health/readiness endpoints;
- alertas por fallos de jobs, webhooks y pagos;
- dashboard de infraestructura;
- errores frontend/backend centralizados.

Nunca registres contraseñas, tokens completos, cookies de sesión ni información financiera sensible.

## 8. Calidad y pruebas

Todo feature debe incluir pruebas adecuadas.

Mínimo:

- unit tests de reglas críticas;
- integration tests contra PostgreSQL real/containerizado;
- API e2e tests;
- Playwright para flujos críticos del usuario;
- tests de autorización negativa;
- tests de idempotencia de webhooks/pagos;
- tests de migraciones;
- pruebas de carga con k6 antes de producción;
- accessibility checks en pantallas críticas.

Flujos e2e obligatorios antes de release:

- registro -> aprobación -> login;
- compra -> webhook -> inscripción/acceso;
- curso -> completar lección -> avance de módulo;
- evaluación -> entrega -> resultado;
- vencimiento -> bloqueo;
- docente -> subir contenido -> revisión -> publicación;
- certificado -> generación -> verificación;
- usuario no autorizado intentando acceder a otro usuario/curso.

## 9. CI/CD y Git

Usa GitHub Actions o equivalente.

Pull Request debe ejecutar:

- install con lockfile;
- lint;
- format check;
- typecheck;
- unit/integration tests;
- build;
- migration validation;
- dependency/secret scan.

Ramas protegidas, PR obligatorio y revisión para cambios de migraciones, auth, pagos o permisos.

Entornos separados:

- local;
- test;
- staging;
- production.

Nunca usar la base de producción para desarrollo.

## 10. UX y diseño

El producto debe ser responsive y accesible. Mantén un design system reutilizable. Prioriza:

- navegación clara;
- dashboard del estudiante con progreso, próximo evento y accesos rápidos;
- dashboard del docente con cursos, sesiones y pendientes;
- dashboard administrativo con usuarios pendientes, matrículas, ingresos, progreso y actividad;
- estados vacíos, loading, error y permisos denegados bien diseñados;
- WCAG 2.2 AA como objetivo razonable.

## 11. IA / recomendaciones

No inventes una “red neuronal” solo para cumplir el requisito. Implementa primero un motor de recomendaciones por reglas explicables. En paralelo deja una interfaz `RecommendationEngine`.

Solo habilita ML/red neuronal cuando existan:

- objetivo definido;
- dataset suficiente y autorizado;
- baseline simple;
- train/validation/test;
- métrica de éxito;
- versionado del modelo;
- monitoreo de calidad;
- consentimiento y privacidad;
- rollback a reglas.

## 12. Forma de trabajo obligatoria del agente

Antes de escribir código:

1. inspecciona el repositorio y documentación existente;
2. enumera qué ya existe y qué falta;
3. identifica riesgos o contradicciones;
4. propone el cambio mínimo coherente;
5. si cambia arquitectura o datos, crea/actualiza un ADR;
6. implementa por una vertical slice completa, no por cientos de archivos vacíos;
7. ejecuta lint, typecheck y tests;
8. reporta exactamente qué archivos cambiaste y qué verificaste.

No elimines código o SQL funcional solo por preferencia estética. No agregues dependencias innecesarias. No crees wrappers genéricos sin caso de uso real. No generes microservicios, CQRS, event sourcing o Kubernetes porque “suena profesional”. Primero resuelve correctamente el producto.

## 13. Orden de implementación

### Sprint 0 — Fundación

- monorepo;
- configuración TypeScript/lint/format;
- Docker local;
- PostgreSQL + Redis;
- migración inicial;
- API health;
- OpenAPI;
- logging/correlation ID;
- CI;
- web shell + design system;
- estrategia de auth.

### Sprint 1 — Identidad y catálogo

- registro;
- aprobación;
- login/logout;
- recuperación/verificación;
- roles/permisos;
- catálogo público;
- detalle de curso y biblioteca pública permitida.

### Sprint 2 — Aula

- inscripción;
- módulos/lecciones;
- progreso;
- reglas de desbloqueo;
- dashboard estudiante;
- sesiones en vivo;
- grabaciones privadas.

### Sprint 3 — Evaluación y docente

- evaluaciones;
- tareas;
- entregas;
- retroalimentación;
- gestión docente;
- workflow de revisión/publicación.

### Sprint 4 — Comercio

- planes;
- órdenes;
- integración QR/proveedor;
- webhooks;
- comprobantes;
- reembolsos;
- reporting.

### Sprint 5 — Certificados y comunicación

- certificados;
- correo;
- WhatsApp;
- notificaciones;
- worker y reintentos.

### Sprint 6 — Hardening y lanzamiento

- performance;
- seguridad;
- observabilidad;
- backups/restore test;
- load tests;
- accesibilidad;
- staging/UAT;
- runbooks;
- release production.

## 14. Definition of Done

Una historia no está terminada si solo “funciona en mi PC”. Debe tener:

- código tipado y legible;
- validación;
- autorización;
- manejo de errores;
- tests;
- logs apropiados;
- documentación mínima;
- migración si corresponde;
- no exponer secretos;
- UI responsive y accesible si aplica;
- aceptación del flujo de negocio.

## 15. Primera respuesta esperada del agente

Cuando se use este prompt sobre el repositorio, NO empieces creando 100 archivos. Primero responde con:

1. diagnóstico del estado actual;
2. arquitectura final propuesta;
3. árbol de carpetas;
4. lista de decisiones/ADR;
5. backlog priorizado del Sprint 0;
6. riesgos/bloqueos;
7. cambios concretos que implementarás primero.

Después empieza por la primera vertical slice y deja el repositorio ejecutable en cada paso.
