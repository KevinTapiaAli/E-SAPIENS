# E-SAPIENS LMS

Plataforma educativa web en desarrollo. La primera entrega funcional permite explorar cursos, consultar sus temarios publicados y buscar fichas bibliográficas. Los datos se leen desde PostgreSQL a través de NestJS; Next.js presenta la información sin conectarse directamente a la base.

## Estado actual

- Web: inicio, catálogo con búsqueda y paginación, detalle de curso y biblioteca con fichas, autoría y temas.
- API: salud, disponibilidad de PostgreSQL/Redis y cuatro endpoints públicos documentados en OpenAPI.
- Contratos TypeScript compartidos, validación de entradas, consultas SQL parametrizadas y pruebas de integración contra PostgreSQL.
- Demo local: tres cursos y dos fichas ficticias. No contiene credenciales de acceso utilizables.
- Pendiente: registro, aprobación, autenticación, aula, administración, progreso, pagos, evaluaciones, certificados y publicación en producción. `/login` informa que el acceso está en preparación.

El alcance vigente es **web**. La aplicación móvil queda fuera del trabajo hasta completar el proyecto web. Infraestructura, concurrencia y financiación de la operación todavía deben confirmarse con E-SAPIENS.

## Arquitectura

```text
Navegador → Next.js (apps/web) → NestJS REST (apps/api) → PostgreSQL
                                    └→ Redis (comprobación de disponibilidad)
          ↖ contratos TypeScript compartidos ↗
```

Monorepo pnpm + Turborepo, con monolito modular por dominio. Se conserva el esquema recibido: 74 tablas y 26 funciones. `apps/worker`, `packages/ui` y `packages/config` son reservas documentadas; aún no son servicios o paquetes ejecutables. Almacenamiento privado, colas y proveedores externos se implementarán cuando sus casos de uso estén definidos.

## Preparación local

Para instalarlo por primera vez en otra computadora, seguir la [guía de preparación de la laptop](docs/13-laptop-setup.md), que incluye clonación desde `develop`, configuración, datos de demostración y sincronización del trabajo.

Requisitos: Node.js 24 (versión de referencia en `.node-version`), pnpm 10.34.5 y Docker con Compose. Ejecutar desde la raíz. En Windows PowerShell, utilizar `pnpm.cmd` si la política de ejecución bloquea `pnpm.ps1`.

Crear los archivos de entorno **solo si no existen**:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
pnpm.cmd install --frozen-lockfile
docker compose -f docker-compose.dev.yml up -d
```

La configuración local usa PostgreSQL en `localhost:5433`, Redis en `localhost:6379`, API en `localhost:4000` y web en `localhost:3000`. Los valores de ejemplo de Docker son exclusivamente locales. No copiar estas credenciales a producción.

Si la base está **vacía y no tiene esquema `lms`**:

```powershell
pnpm.cmd db:init
```

Si ya tiene el esquema, conservarlo y ejecutar únicamente:

```powershell
pnpm.cmd db:check
```

Para añadir contenido ficticio local, sin sobrescribir registros existentes:

```powershell
pnpm.cmd db:seed:demo
pnpm.cmd dev
```

`dev` inicia web y API. Abrir [la web local](http://localhost:3000), [Swagger](http://localhost:4000/api/docs) y [readiness](http://localhost:4000/api/v1/health/ready). Detener las aplicaciones con Ctrl+C. Para detener PostgreSQL/Redis conservando datos, usar `docker compose -f docker-compose.dev.yml stop`.

`db:init` y `db:seed:demo` exigen `APP_ENV=local` o `test`, `NODE_ENV` distinto de `production` y una base `esapiens` o `esapiens_test` en loopback. `db:init` rechaza un esquema existente. Más detalles en [database/README.md](database/README.md).

## Verificación

Con PostgreSQL y Redis disponibles:

```powershell
pnpm.cmd format:check
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd test:e2e
pnpm.cmd build
```

Las pruebas de catálogo insertan sus propios datos dentro de una transacción y ejecutan `ROLLBACK` al finalizar. No requieren el seed demo ni eliminan datos anteriores. CI instala el esquema en PostgreSQL efímero antes de probar. Un build correcto no sustituye la revisión del navegador ni una prueba de carga.

## Documentación

- [Guion para la reunión del 05/10/2026](docs/11-demo-2026-10-05.md).
- [API y comportamiento del catálogo público](docs/10-public-catalog.md).
- [Sistema visual, temas y accesibilidad](docs/12-visual-system.md).
- [Instalación y trabajo desde otra computadora](docs/13-laptop-setup.md).
- [Arquitectura](docs/01-architecture.md), [roadmap vigente](docs/08-roadmap.md) y [decisiones técnicas](docs/09-decisions-summary.md).
- [Reglas de colaboración](AGENTS.md), [prompt maestro](PROMPT_MAESTRO.md) y [árbol del repositorio](TREE.md).

La demo funciona localmente sin contratar nuevos servicios. El despliegue empresarial permanece pendiente de infraestructura confirmada, copias de seguridad, restauración, seguridad, carga y responsables de operación. No se asume que una computadora de oficina sea un servidor disponible permanentemente.
