# Agenda por perfil y arranque local

Entrega del 06/10/2026. Por petición del propietario no se ejecutaron la aplicación,
navegador, instalación, migraciones, lint, typecheck, build ni pruebas. Los cambios
están escritos, pendientes de validación en ejecución.

## Calendario

El inicio administrativo mantiene la agenda amplia. Docente y estudiante tienen
una agenda compacta junto a su actividad de inicio, que se apila en pantallas
pequeñas. Se puede deslizar horizontalmente con el dedo o el ratón para cambiar
de mes, usar los botones o las flechas del teclado con el calendario enfocado,
seleccionar días, regresar a hoy, abrir tareas y crear, completar o reabrir
recordatorios personales. El gesto horizontal conserva el desplazamiento vertical
y el zoom; las listas diarias y de pendientes tienen desplazamiento propio.

La sección «Próximos pendientes» muestra hasta ocho tareas y recordatorios de los
siguientes 30 días, desde hoy, aunque crucen al siguiente mes. Excluye las tareas
ya entregadas por el estudiante, los recordatorios completados y las horas que
ya pasaron. Las clases se conservan en el calendario, sin generar estos avisos.
Las tareas entregadas siguen visibles en el día del plazo;
entregar no significa aprobar. Los avisos se muestran dentro del portal y se
actualizan al navegar o recargar, sin correo ni notificaciones del sistema.

- Administración consulta las tareas publicadas y clases no canceladas.
- Docentes consultan solo sus materias asignadas.
- Estudiantes consultan cursos publicados con matrícula activa y acceso al módulo.
- Cada usuario consulta y modifica únicamente sus propios recordatorios.
- Se presentan fechas y horas en la zona horaria del perfil.

La API `GET /api/v1/academic/agenda` acepta `month`, `day` y `role`. Devuelve
`days`, `events`, `total` y `upcoming`; los eventos incluyen `occursAt`, nulo para
recordatorios sin hora. Los POST de recordatorios aceptan `role` en la consulta.
El rol se valida contra la sesión y los permisos en NestJS antes de consultar
datos. El puente web conserva ese parámetro también en las escrituras de agenda.
No se añaden dependencias ni migraciones nuevas para este calendario; requiere
las migraciones existentes hasta 0007.

Los cambios complementarios de interfaz, organización y seguridad están descritos
en [optimización y experiencia profesional](21-professional-experience.md).

## Ejecutar el mismo proyecto clonado

Usar la carpeta que contiene el `package.json` raíz, `pnpm-workspace.yaml`,
`apps` y `docker-compose.dev.yml`. No hace falta clonar otra vez. GitHub contiene
el código; los datos y las cuentas de PostgreSQL son locales a cada computadora.

Requisitos: Node.js 24 conforme a `.node-version`, pnpm 10.34.5 y Docker Desktop
abierto con el motor de contenedores Linux listo. Si falta pnpm:

```powershell
npm.cmd install --global pnpm@10.34.5
```

Desde la raíz, ejecutar uno por uno y detenerse si alguno falla:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.example apps/web/.env.local }
pnpm.cmd install --frozen-lockfile
pnpm.cmd infra:up
pnpm.cmd db:prepare
pnpm.cmd dev
```

`infra:up` espera a que PostgreSQL y Redis estén disponibles. `db:prepare` instala
el esquema si falta y aplica las migraciones pendientes, conservando los datos de
una base existente. No crea cuentas ni añade contenido ficticio. Una base importada
con cambios fuera del historial puede necesitar reconciliación de sus migraciones.

Abrir <http://localhost:3000>; API y Swagger en <http://localhost:4000/api/docs>.
Mantener la terminal abierta. En arranques posteriores basta con `pnpm.cmd infra:up`
y `pnpm.cmd dev`; aplicar `pnpm.cmd db:prepare` al recibir nuevas migraciones.
Detener web y API con Ctrl+C antes de iniciar otra instancia en los mismos puertos.

Para contenido ficticio opcional, antes de `dev`:

```powershell
pnpm.cmd db:seed:demo
pnpm.cmd db:seed:classroom
```

Usar las cuentas existentes. Si la base es nueva, seguir la
[guía de primeras cuentas](14-identity-and-workspaces.md).
