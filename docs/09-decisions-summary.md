# Resumen de decisiones técnicas

| Área          | Decisión                                          |
| ------------- | ------------------------------------------------- |
| Arquitectura  | Monolito modular                                  |
| Repo          | Monorepo pnpm + Turborepo                         |
| Web           | Next.js App Router + TypeScript                   |
| API           | NestJS REST `/api/v1`                             |
| Async         | Worker NestJS + BullMQ/Redis                      |
| DB            | PostgreSQL estable soportado                      |
| Data access   | ORM estable + SQL nativo para features avanzadas  |
| API docs      | OpenAPI/Swagger                                   |
| Auth          | Sesiones/tokens revocables, Argon2id progresivo   |
| Storage       | S3 privado + CloudFront                           |
| Video         | HLS + signed cookies cuando se implemente privado |
| Payments      | Port/adapter + verified/idempotent webhooks       |
| Observability | structured logs + metrics + OpenTelemetry         |
| Testing       | unit + integration + E2E + load                   |
| CI/CD         | PR gates + staging + production                   |
| Mobile        | Flutter consumiendo la misma API                  |
| IA            | rules first, ML later with measurable dataset     |
