# E-SAPIENS LMS

Plataforma educativa web en desarrollo. Permite explorar cursos, temarios y fichas bibliográficas, solicitar una cuenta de estudiante e ingresar a espacios de estudiante, docente y administración. NestJS comprueba identidad y permisos sobre PostgreSQL; Next.js presenta la información sin conectarse directamente a la base.

## Estado actual

- Web: inicio, catálogo con búsqueda y paginación, detalle de curso y biblioteca con fichas, autoría y temas.
- API: salud, disponibilidad de PostgreSQL/Redis y cuatro endpoints públicos documentados en OpenAPI.
- Contratos TypeScript compartidos, validación de entradas, consultas SQL parametrizadas y pruebas de integración contra PostgreSQL.
- Demo local: tres cursos y dos fichas ficticias. No contiene credenciales de acceso utilizables.
- Identidad: registro de estudiante pendiente, aprobación administrativa y login/logout. Alta de docentes y administradores mediante CLI controlada. [Guía de acceso](docs/14-identity-and-workspaces.md).
- Portal privado: dashboards por perfil, solicitudes, consulta de usuarios/cursos, matrícula administrativa, asignación docente y consulta del progreso persistido. [Guía del portal](docs/15-private-portal.md).
- Calendario lateral derecho, oculto hasta abrirlo en los tres perfiles; conserva deslizamiento, clases y avisos de próximos pendientes. [Agenda y arranque local](docs/20-calendar-and-local-start.md).
- Panel ejecutivo administrativo: visitantes estimados, materias consultadas, conversiones, actividad semanal, inactividad y prioridades para seguimiento. Requiere migración 0008. [Definiciones y activación](docs/22-executive-dashboard.md).
- Mejoras del 06/10: carrusel institucional cada 5 segundos, consultas optimizadas, limpieza de recursos sin uso y refuerzo de seguridad. Revisión manual, sin ejecutar pruebas por indicación del propietario. [Detalle de cambios](docs/21-professional-experience.md).
- Ampliación del 05/10: solicitudes de inscripción a materias, autorizaciones por módulo y plazo, aula de lectura y registro de avance. Código pendiente de comprobación por el propietario; requiere migración 0004. [Preparación y recorrido de prueba](docs/16-enrollment-classroom.md).
- Pendiente: recuperación/verificación de correo, recursos y video privados, edición de contenidos, pagos, evaluaciones, certificados y publicación en producción.

El alcance vigente es **web**. La aplicación móvil queda fuera del trabajo hasta completar el proyecto web. Infraestructura, concurrencia y financiación de la operación todavía deben confirmarse con E-SAPIENS.

## Arquitectura

```text
Navegador → Next.js (apps/web) → NestJS REST (apps/api) → PostgreSQL
                                    └→ Redis (disponibilidad y límites de autenticación)
          ↖ contratos TypeScript compartidos ↗
```

Monorepo pnpm + Turborepo, con monolito modular por dominio. Se conserva el esquema recibido: 74 tablas y 26 funciones. `apps/worker`, `packages/ui` y `packages/config` son reservas documentadas; aún no son servicios o paquetes ejecutables. Almacenamiento privado, colas y proveedores externos se implementarán cuando sus casos de uso estén definidos.

## Preparación local

Para instalarlo por primera vez en otra computadora, seguir la [guía de preparación de la laptop](docs/13-laptop-setup.md), que incluye clonación desde `develop`, configuración, datos de demostración y sincronización del trabajo.

Requisitos: Node.js 24 (versión de referencia en `.node-version`), pnpm 10.34.5 y Docker con Compose. Ejecutar desde la raíz. En Windows PowerShell, utilizar `pnpm.cmd` si la política de ejecución bloquea `pnpm.ps1`.

La raíz es la carpeta que contiene `package.json` y `pnpm-workspace.yaml`. Si PowerShell muestra `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` y estás en la carpeta exterior que contiene el clon `E-SAPIENS`, entra primero con `Set-Location .\E-SAPIENS`. `db:migrate` es un script del proyecto: se ejecuta con `pnpm.cmd db:migrate`, no como comando independiente.

Crear los archivos de entorno **solo si no existen**:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
pnpm.cmd install --frozen-lockfile
pnpm.cmd infra:up
pnpm.cmd db:prepare
pnpm.cmd dev
```

La configuración local usa PostgreSQL en `localhost:5433`, Redis en `localhost:6379`, API en `localhost:4000` y web en `localhost:3000`. Los valores de ejemplo de Docker son exclusivamente locales. No copiar estas credenciales a producción.

`db:prepare` instala el esquema inicial únicamente si no existe y aplica las migraciones pendientes hasta incluir agenda, tareas y perfiles. Conserva los datos existentes. Sirve tanto para el clon nuevo como para continuar con la base local. Si un comando falla, resolverlo antes de ejecutar el siguiente.

Como alternativa manual, si la base está **vacía y no tiene esquema `lms`**:

```powershell
pnpm.cmd db:init
pnpm.cmd db:migrate
```

Si ya tiene el esquema, conservarlo. Verificar y aplicar las migraciones incrementales:

```powershell
pnpm.cmd db:check
pnpm.cmd db:migrate
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
- [Acceso, aprobación y creación de las primeras cuentas](docs/14-identity-and-workspaces.md).
- [Portal privado, matrículas y asignación de docentes](docs/15-private-portal.md).
- [Inscripción a materias, módulos autorizados y aula](docs/16-enrollment-classroom.md).
- [Arquitectura](docs/01-architecture.md), [roadmap vigente](docs/08-roadmap.md) y [decisiones técnicas](docs/09-decisions-summary.md).
- [Reglas de colaboración](AGENTS.md), [prompt maestro](PROMPT_MAESTRO.md) y [árbol del repositorio](TREE.md).

La demo funciona localmente sin contratar nuevos servicios. El despliegue empresarial permanece pendiente de infraestructura confirmada, copias de seguridad, restauración, seguridad, carga y responsables de operación. No se asume que una computadora de oficina sea un servidor disponible permanentemente.
