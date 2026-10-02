# Resumen de decisiones técnicas

La tabla conserva la arquitectura objetivo del blueprint. Implementado al 01/10/2026: web, API de lectura pública/salud, PostgreSQL por `pg`, conexión Redis y contratos TypeScript. El [ADR 0004](adr/0004-public-catalog.md) documenta esta entrega. Worker, autenticación, pagos, video y proveedores externos siguen pendientes; no hay hosting contratado. La aplicación móvil queda fuera de alcance hasta finalizar la web.

| Área          | Decisión                                                |
| ------------- | ------------------------------------------------------- |
| Arquitectura  | Monolito modular                                        |
| Repo          | Monorepo pnpm + Turborepo                               |
| Web           | Next.js App Router + TypeScript                         |
| API           | NestJS REST `/api/v1`                                   |
| Async         | Worker NestJS + BullMQ/Redis                            |
| DB            | PostgreSQL estable soportado                            |
| Data access   | `pg` + SQL parametrizado; ORM a evaluar si aporta valor |
| API docs      | OpenAPI/Swagger                                         |
| Auth          | Sesiones/tokens revocables, Argon2id progresivo         |
| Storage       | S3 privado + CloudFront                                 |
| Video         | HLS + signed cookies cuando se implemente privado       |
| Payments      | Port/adapter + verified/idempotent webhooks             |
| Observability | structured logs + metrics + OpenTelemetry               |
| Testing       | unit + integration + E2E + load                         |
| CI/CD         | PR gates + staging + production                         |
| Mobile        | Fuera de alcance hasta completar la web                 |
| IA            | rules first, ML later with measurable dataset           |
