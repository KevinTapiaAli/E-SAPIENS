# API E-SAPIENS

NestJS es la autoridad de negocio. La web consume REST bajo `/api/v1`; no accede directamente a PostgreSQL.

## Ejecución desde la raíz

```powershell
pnpm.cmd --filter esapiens-api dev
pnpm.cmd --filter esapiens-api typecheck
pnpm.cmd --filter esapiens-api test
pnpm.cmd --filter esapiens-api test:e2e
pnpm.cmd --filter esapiens-api build
```

Configuración en `.env` de la raíz: `DATABASE_URL`, `REDIS_URL`, `APP_ENV` y `PORT` opcional (4000 por defecto). La preparación completa está en el [README principal](../../README.md).

## Módulos implementados

- `health`: liveness y readiness para PostgreSQL/Redis.
- `catalog`: cursos públicos y temarios publicados.
- `library`: fichas públicas y temas bibliográficos.
- `infrastructure`: pool PostgreSQL y conexión Redis.
- `common/http`: validación global, errores estables y configuración HTTP compartida con las pruebas.

Swagger: `http://localhost:4000/api/docs`; documento JSON: `/api/docs-json`. Contratos y reglas: [catálogo público](../../docs/10-public-catalog.md).

## Pruebas

Las pruebas unitarias actuales cubren salud. Las pruebas E2E cubren HTTP, validación, búsqueda, paginación, visibilidad y exclusión de contenido privado con PostgreSQL real. Los datos de catálogo se crean dentro de una transacción que se revierte al finalizar, sin modificar registros preexistentes.

Las pruebas de escritura solo admiten `APP_ENV=local|test`, base local `esapiens|esapiens_test` y nunca `NODE_ENV=production`. Redis debe estar disponible para readiness. No usar la configuración local como configuración de producción.

Los endpoints de autenticación, administración, matrícula y pagos todavía no están implementados. El esquema SQL no implica que estas funcionalidades de aplicación existan.
