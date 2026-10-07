# Arquitectura objetivo

## Estilo

**Monolito modular + worker asíncrono + almacenamiento externo**, preparado para extracción futura de servicios.

```text
Navegador web
      |
      v
  Next.js Web ----------------------+
      | HTTPS                       |
      v                             |
 NestJS API  <---- OpenAPI ---------+
      |
      +--> PostgreSQL
      +--> Redis/BullMQ --> Worker
      +--> Object Storage/CDN
      +--> Payment Provider
      +--> Email / WhatsApp
      +--> Meet / Zoom links
```

## Implementación vigente (04/10/2026)

Web Next.js, API NestJS con módulos de salud/catálogo/biblioteca/identidad/gestión académica, PostgreSQL mediante `pg` y Redis para readiness y límites de autenticación. Contratos compartidos públicos, de identidad y académicos. Sesiones opacas y aprobación según [ADR 0005](adr/0005-web-identity.md). El [portal privado](15-private-portal.md) usa layout propio dentro de Next.js y consulta métricas, matrículas y asignaciones autorizadas por NestJS según [ADR 0006](adr/0006-private-portal.md). Worker, colas, almacenamiento y proveedores del diagrama siguen siendo arquitectura objetivo. La aplicación móvil está excluida del alcance actual.

Las lecturas públicas simples usan servicios de módulo con SQL parametrizado; no se crean capas vacías ni se añade un ORM sin necesidad. Véase [ADR 0004](adr/0004-public-catalog.md). Las reglas de dominio y ports de las siguientes secciones se incorporarán cuando existan casos de negocio que los requieran.

## Por qué no microservicios ahora

Ampliación codificada el 05/10/2026, pendiente de validación: el módulo académico
incorpora servicios de inscripción/autorizaciones y aula. Reutiliza las funciones
SQL de acceso efectivo y progreso; Next.js añade solicitudes de materias, gestión
de plazos y lectura de lecciones. [ADR 0007](adr/0007-enrollment-classroom.md).

Microservicios añadirían despliegues, redes, observabilidad distribuida, consistencia eventual, contratos y fallos parciales antes de tener carga que lo justifique. La separación por módulos deja límites claros y facilita una extracción posterior.

## Por qué Next.js y no React+Vite puro

E-SAPIENS incluye catálogo público, páginas institucionales y fichas que se benefician de SEO/renderizado del servidor. Next.js cubre esa superficie y también permite dashboards interactivos. La complejidad de negocio se mantiene en NestJS para evitar acoplarla a convenciones del frontend.

React+Vite sería válido para un dashboard puramente privado. React Router Framework Mode también es una alternativa sólida. Para este producto mixto público+privado, se estandariza Next.js para reducir decisiones y herramientas duplicadas.

## Reglas de dependencias

- `presentation` depende de `application`.
- `application` depende del dominio y ports.
- `domain` no conoce NestJS, Prisma, HTTP, Redis ni AWS.
- `infrastructure` implementa ports.
- módulos se comunican mediante interfaces/application services; evitar imports cruzados arbitrarios.

## BFF

No crear una segunda lógica de negocio en Route Handlers de Next.js. Se pueden usar como proxy/BFF solo cuando exista un motivo de seguridad o experiencia concreto; la autoridad sigue en NestJS.
