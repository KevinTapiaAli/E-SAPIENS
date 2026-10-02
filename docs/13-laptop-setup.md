# Ejecutar E-SAPIENS en otra computadora

Actualizado: 02/10/2026. Guía para Windows con PowerShell, desarrollo y demostración local. El repositorio contiene la web y API del catálogo público; el aula y la autenticación siguen pendientes. Publicar el código en GitHub permite continuar el trabajo desde otra computadora, pero no publica automáticamente un sitio en Internet.

## 1. Preparar la laptop

Instalar Git, [Node.js](https://nodejs.org/en/download) **24.21.0** (versión fijada en `.node-version`) y [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/). Configurar Docker con WSL 2 y contenedores Linux siguiendo su guía. Abrir Docker Desktop y esperar a que el motor esté listo.

Instalar la versión de pnpm fijada por el proyecto, desde PowerShell:

```powershell
npm.cmd install --global pnpm@10.34.5
git --version
node --version
pnpm.cmd --version
docker compose version
```

Se usa `.cmd` para evitar el bloqueo de scripts `.ps1` de PowerShell. No es necesario cambiar la política de ejecución. La primera instalación requiere Internet para descargar dependencias, imágenes Docker y las fuentes del build.

## 2. Obtener el código

Desde la carpeta donde quieras guardar el proyecto:

```powershell
git clone --branch develop https://github.com/KevinTapiaAli/E-SAPIENS.git
Set-Location E-SAPIENS
git branch --show-current
```

Si GitHub solicita autenticación, iniciar sesión con una cuenta que tenga acceso al repositorio. No incluir contraseñas ni tokens en la URL.

Si ya tienes un clon en la laptop, no clones encima ni reemplaces sus archivos. Ejecuta `git status`, conserva cualquier trabajo pendiente y, cuando el árbol esté limpio, usa `git switch develop` y `git pull --ff-only origin develop`.

## 3. Configuración y dependencias

Ejecutar desde la raíz del repositorio. Los archivos locales se crean solo si no existen:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
pnpm.cmd install --frozen-lockfile
```

No continuar si falla la instalación. Las plantillas ya contienen las direcciones necesarias para la demo local. Los campos de proveedores externos son reservas; la demo actual no requiere contratar AWS, correo ni pagos. Los archivos `.env` y `.env.local` permanecen fuera de Git.

## 4. PostgreSQL y Redis

```powershell
docker compose -f docker-compose.dev.yml up -d --wait
docker compose -f docker-compose.dev.yml ps
```

Ambos servicios deben figurar como saludables (`healthy`). Docker conserva PostgreSQL en un volumen local de esta laptop.

**Solo en la primera instalación, con una base vacía:**

```powershell
pnpm.cmd db:init
pnpm.cmd db:seed:demo
pnpm.cmd db:check
```

Ejecutar los comandos uno por uno y detenerse si aparece un error. `db:init` instala el esquema original y rechaza un esquema `lms` existente. Si ya tienes datos, omite `db:init` y comprueba la base con `pnpm.cmd db:check`. El seed es opcional, agrega tres cursos y dos fichas ficticias y no sobrescribe registros existentes.

Con una instalación nueva y el seed, la comprobación muestra 74 tablas, 26 funciones, 3 cursos publicados y 2 fichas públicas. Sin el seed, los catálogos pueden estar vacíos.

GitHub transporta código, migraciones y el seed; **no sincroniza el contenido de PostgreSQL entre computadoras**. Para continuar la demo basta con el seed. Si posteriormente necesitas trasladar datos propios, utiliza una copia y restauración controlada, fuera de Git.

## 5. Iniciar y comprobar

```powershell
pnpm.cmd dev
```

Mantener esta terminal abierta. Se inician Next.js y NestJS juntos.

| Servicio                     | Dirección local                           |
| ---------------------------- | ----------------------------------------- |
| Web                          | http://localhost:3000                     |
| Cursos                       | http://localhost:3000/cursos              |
| Biblioteca                   | http://localhost:3000/biblioteca          |
| Swagger / API documentada    | http://localhost:4000/api/docs            |
| Estado de PostgreSQL y Redis | http://localhost:4000/api/v1/health/ready |

Para la demostración, abrir un curso, expandir su temario, buscar una ficha bibliográfica y alternar el tema claro/oscuro. El acceso al aula muestra su estado pendiente; todavía no hay cuentas para iniciar sesión.

## 6. Detener y volver a trabajar

Detener web y API con Ctrl+C. Luego, desde la raíz:

```powershell
docker compose -f docker-compose.dev.yml stop
```

Para iniciar otro día, abrir Docker Desktop y ejecutar:

```powershell
docker compose -f docker-compose.dev.yml up -d --wait
pnpm.cmd dev
```

No es necesario inicializar ni cargar el seed cada día. Evitar `docker compose down -v`: elimina los volúmenes y puede borrar la base local.

## 7. Continuar entre la PC y la laptop

Antes de empezar, comprobar `git status`. Si no hay cambios pendientes, actualizar `develop` con `git pull --ff-only origin develop`. Después de actualizar el código, ejecutar `pnpm.cmd install --frozen-lockfile`. Revisar las instrucciones de futuras migraciones; no volver a ejecutar la migración inicial sobre datos existentes.

Para una tarea nueva, crear una rama corta desde `develop` según `CONTRIBUTING.md`. Antes de cambiar de computadora, guardar el trabajo en un commit y subir su rama. En la otra computadora, hacer `git fetch origin` y abrir esa misma rama. Si Git informa divergencia o conflictos, resolverlos conservando ambos trabajos; no usar `reset --hard` o un push forzado como método de sincronización.

Comprobaciones antes de entregar cambios, con PostgreSQL y Redis disponibles:

```powershell
pnpm.cmd format:check
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd test:e2e
pnpm.cmd build
```

Las pruebas de integración usan una transacción con rollback y conservan los datos previos. Un build correcto comprueba la compilación; no inicia las aplicaciones.

## Problemas habituales

| Síntoma                                                  | Qué revisar                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm.ps1` está bloqueado                                | Usar `pnpm.cmd`, como en esta guía.                                                                                |
| Docker no puede conectarse al motor                      | Abrir Docker Desktop, comprobar WSL 2 y esperar al inicio del motor.                                               |
| `ECONNREFUSED`, readiness falla o catálogo no disponible | Revisar que PostgreSQL y Redis estén saludables, que la API esté iniciada y que existan ambos archivos de entorno. |
| Puerto ocupado                                           | Revisar 3000, 4000, 5433 y 6379; cerrar únicamente el servicio propio que esté usando el puerto.                   |
| El esquema `lms` ya existe                               | Conservarlo y usar `db:check`, sin reinicializarlo.                                                                |
| No hay cursos o fichas                                   | Ejecutar el seed opcional si se trata de la base de demostración local.                                            |
| Error al descargar Geist durante el build                | Revisar la conexión y el acceso a Google Fonts; la fuente se obtiene mediante `next/font`.                         |

Esta configuración permite desarrollar y presentar el avance desde la laptop. La publicación empresarial en Internet requiere definir infraestructura y operación según [despliegue y operación](07-deployment.md); no exponer directamente esta configuración de desarrollo.
