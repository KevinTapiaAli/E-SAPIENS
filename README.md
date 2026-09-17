# E-SAPIENS LMS — Professional Starter Blueprint

Este paquete es la base de arquitectura, reglas técnicas y documentación para desarrollar E-SAPIENS como producto web real, mantenible y desplegable.

## Decisión principal

Se propone un **monolito modular** con separación por dominios, no microservicios prematuros:

- `apps/web`: Next.js + TypeScript. Catálogo público, SEO, autenticación y dashboards.
- `apps/api`: NestJS + TypeScript. Única fuente de reglas de negocio, autorización y API REST `/api/v1`.
- `apps/worker`: NestJS standalone/BullMQ. Correos, WhatsApp, certificados, vencimientos, eventos y trabajos costosos.
- `PostgreSQL`: fuente de verdad transaccional.
- `Redis`: colas, rate-limit y caché cuando exista una necesidad medible.
- `S3 + CloudFront`: archivos privados y video/HLS con acceso temporal.
- `OpenAPI`: contrato oficial de la API y base para futura app Flutter.

## Regla de oro

El frontend **nunca** accede directamente a PostgreSQL ni decide permisos, precios, notas, roles o accesos. Todo pasa por la API NestJS.

## Orden recomendado de lectura

1. `PROMPT_MAESTRO.md`
2. `docs/00-product-brief.md`
3. `docs/01-architecture.md`
4. `docs/02-domain-modules.md`
5. `docs/03-database-review.md`
6. `docs/04-api-conventions.md`
7. `docs/05-security.md`
8. `docs/06-testing-quality.md`
9. `docs/07-deployment.md`
10. `docs/08-roadmap.md`
11. `AGENTS.md`

## Estado de la base de datos recibida

La propuesta existente ya incluye una base avanzada con 74 tablas, vistas, funciones, triggers, RBAC, progreso, evaluación, tareas, pagos, certificados, auditoría y recomendaciones. No se debe borrar ni reemplazar sin análisis.

Se incluyó una migración de referencia en `database/migrations/0001_initial_schema.sql`, separando el esquema de los datos ficticios. Los datos demo con contraseñas conocidas **no deben formar parte de producción**.

## Lo que este paquete NO pretende hacer

No es todavía la aplicación completa. Es la especificación técnica y el esqueleto de gobernanza para que el desarrollo posterior no termine en un conjunto de archivos improvisados. El siguiente paso correcto es construir el Sprint 0 y después el MVP por dominios.
