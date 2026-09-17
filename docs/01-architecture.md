# Arquitectura objetivo

## Estilo

**Monolito modular + worker asíncrono + almacenamiento externo**, preparado para extracción futura de servicios.

```text
Browser / Flutter
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

## Por qué no microservicios ahora

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
