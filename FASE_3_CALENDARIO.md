# E-SAPIENS — Fase 3: calendario académico inteligente

Fecha: 23/11/2026 (America/La_Paz). Rama: `feat/ux-performance-calendar-assistant`.
Base de esta fase: `2f31c35`, posterior al commit de rendimiento `dfc7150`.

## Resultado

Se amplió el calendario existente, conservando sus recordatorios, formularios, gestos y carga bajo demanda en el panel lateral. La agenda completa ofrece mes, semana y próximos 30 días, navegación a hoy y a un mes/año, selección de día, leyenda y filtros por clases, tareas, evaluaciones, recordatorios y feriados. Los días muestran cantidades y pendientes; el panel de detalle incluye estado, fecha en la zona del perfil y acceso a la actividad autorizada.

La agenda está disponible desde «Mi agenda» en Aula virtual y desde el botón lateral en Gestión académica. En la página completa se suprime la instancia lateral para evitar lecturas duplicadas. Se conservaron la barra desplegable, portales, prioridades docentes, Centro de Datos, Excel/CSV y optimizaciones anteriores. No se agregaron frameworks visuales ni dependencias de ejecución.

| Perfil         | Agenda completa                                   |
| -------------- | ------------------------------------------------- |
| Administración | http://localhost:3000/portal/administrador/agenda |
| Docente        | http://localhost:3000/portal/docente/agenda       |
| Estudiante     | http://localhost:3000/portal/estudiante/agenda    |

Los botones y filtros tienen nombres accesibles, estados de carga, errores y reintento. Se conservan los gestos horizontales sin capturar el desplazamiento vertical; las flechas seleccionan días, arriba/abajo cambian una semana y Home/End recorren los extremos de la semana. Las animaciones respetan movimiento reducido. El diseño usa una columna en móvil/tableta y dos desde el punto de corte `xl`, con contenedores que pueden reducir su ancho.

## API interna y permisos

Se reutiliza `GET /api/v1/academic/agenda` del gateway, expuesto al frontend por `/api/academic/agenda`. Mantiene `role`, `month=AAAA-MM` y `day=AAAA-MM-DD`, además de las escrituras de recordatorios existentes.

- Sin `view`, conserva `days`, `events`, `upcoming` y `total`, sin introducir evaluaciones a los clientes anteriores.
- `view=month|week|upcoming` incorpora `periodEvents` y `period={from,to,total,limit}`. La semana comienza en lunes; próximos comprende hoy y los 29 días siguientes en la zona del usuario. Fechas válidas: 2000–2099.
- `type=todos|clase|tarea|evaluacion|recordatorio|feriado` aplica el filtro en servidor. Los feriados se leen por separado; el filtro `feriado` devuelve cero eventos académicos.
- La interfaz obtiene el período completo una vez: seleccionar otro día del mismo mes/semana no repite la petición. Comparte lecturas en curso entre efectos de React. No se introduce una caché global de información privada.
- Se limita el detalle del período a 1.000 eventos y se informa si hay más. Los conteos diarios y pendientes abarcan todos los eventos internos del período. La lectura conserva la lista próxima usada por el calendario compacto.

La consulta usa parámetros y alcance por rol: administración requiere `academic.read`; docentes necesitan `teaching.manage` y asignación a la materia; estudiantes necesitan `classroom.study`, matrícula activa, materia publicada y acceso al módulo. Los recordatorios pertenecen exclusivamente al usuario autenticado. Se conservan sesiones, comprobación de origen en escrituras y reglas existentes de fechas.

Solo se muestran evaluaciones publicadas de módulos accesibles, con preguntas admitidas por el flujo actual. Como el modelo no proporciona una fecha programada general, el evento identifica explícitamente **la fecha del registro, no un plazo de entrega**. Un intento propio en curso puede aportar su vencimiento real. No se inventan fechas de evaluaciones ni se muestran respuestas, notas privadas o enlaces de reunión en la agenda.

## Feriados: Nager.Date

Se verificaron la documentación oficial y solicitudes reales para `BO`. Tanto la API v3 como v4 respondieron HTTP 200 y entregaron 12 registros de Bolivia para 2026. Se integró la **v4**, porque la documentación anuncia el fin de vida de v3 para el 31/01/2027. Referencia: [ejemplos REST oficiales de Nager.Date](https://github.com/nager/Nager.Date/blob/main/doc/examples/rest-api.md).

Endpoint usado, consultado únicamente desde el servicio académico:

```text
https://nagerholidays.com/api/v4/Holidays/BO/{year}
```

Endpoint autenticado para el frontend:

```text
GET /api/academic/agenda/holidays?role=estudiante&year=2026
```

La respuesta contiene `year`, `country`, `status`, `events` y `source`. Se valida el arreglo y cada registro: fecha real del año solicitado, país, nombre, indicador nacional y tipos reconocidos. La solicitud tiene timeout de 2,5 segundos, no sigue redirecciones y limita el tamaño aceptado de respuesta. El servidor comparte solicitudes simultáneas y mantiene caché pública por año: 24 horas si responde correctamente y 5 minutos ante fallo.

Se incluyen únicamente feriados públicos nacionales: el perfil no tiene una subdivisión que permita asignar feriados regionales. Los nombres se conservan como los entrega el proveedor, actualmente en inglés; no se traducen ni completan con datos inventados. No se certifica que el proveedor incluya todos los feriados que puedan declararse en Bolivia.

Un país no disponible, HTTP de error, timeout, arreglo vacío o registro incompleto/inválido produce `status=unavailable` y ningún feriado. La agenda interna se consulta de manera independiente y continúa funcionando. La interfaz informa el fallo y no elimina actividades académicas. Ningún feriado modifica clases, entregas o reglas académicas. Si un período abarca dos años y falla uno, se omiten los feriados del período completo para evitar presentar información parcial.

## Exportación iCalendar

«Descargar calendario .ics» exporta el período y filtro seleccionados. Ruta autenticada: `GET /api/academic/agenda/export.ics`, con los mismos parámetros; también está disponible en el gateway bajo `/api/v1/academic/agenda/export.ics`.

El archivo usa fechas con hora en UTC y eventos de día completo con fin exclusivo. Conserva la hora final real de las clases; no añade duraciones ficticias a plazos. Los UID se derivan de usuario, tipo e identificador, son estables y opacos. Se eliminan duplicados, se escapan textos y se pliegan líneas UTF-8 a un máximo de 75 octetos, con CRLF, según [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).

Se conserva el mismo control de acceso de la consulta, `Cache-Control: no-store` y un nombre de archivo con fechas. No se exportan correos, tokens, asistentes ni enlaces privados de reuniones. El límite es 10.000 eventos internos por descarga; si se supera, responde con error y solicita reducir el período o filtrar, sin entregar un calendario truncado. No se implementó OAuth ni sincronización bidireccional.

## Validación ejecutada

| Verificación                                                              | Resultado                                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Tipos de API y web                                                        | Aprobados                                                             |
| Build completo de API y web                                               | Aprobado                                                              |
| Lint de los archivos web modificados                                      | Sin errores ni advertencias                                           |
| Lint de API                                                               | Sin errores; permanecen dos advertencias previas del exportador Excel |
| Pruebas unitarias de agenda                                               | 30 aprobadas                                                          |
| Integración PostgreSQL del Centro de Datos y agenda                       | 11 aprobadas, con savepoint/rollback                                  |
| Lógica y renderizado controlado del frontend                              | 20 comprobaciones aprobadas                                           |
| Agenda por HTTP, filtros, permisos y descargas                            | 142 comprobaciones aprobadas                                          |
| Enlaces de actividades extraídos de los ICS                               | 12 rutas autorizadas respondieron correctamente                       |
| Regresión de portales, 20 logins, servicios, Centro de Datos, Excel y CSV | 196 comprobaciones aprobadas                                          |

Se cubrieron febrero bisiesto, meses/años y límites 2000/2099, días vacíos, eventos simultáneos, zonas horarias, acceso al módulo y pertenencia a materias, recordatorios propios, evaluaciones ocultas, filtros, contrato anterior, cargas, reintento y solicitudes sin duplicar. Los casos de proveedor caído, timeout, error HTTP y respuesta malformada se probaron mediante sustitución controlada del proveedor en pruebas unitarias; no se provocó una caída del servicio real.

Los archivos descargados de los tres roles y un archivo con casos extremos fueron abiertos por [ical.js](https://github.com/kewisch/ical.js), parser independiente instalado únicamente en `.tmp/phase3/ical-parser/`. Se comprobaron UID estables y únicos, alcance autorizado, nombres Unicode, caracteres escapados, intento de inyección de otro VEVENT, precisión de segundos, cambio horario y fin exclusivo del 31/12/2099 al 01/01/2100. No se cambió el manifiesto ni el lockfile del proyecto.

**Límite de verificación:** el navegador conectado no está disponible: el selector informó `No browser is available` y la lista resultó vacía. Las pruebas de teclado y gestos ejecutan manejadores en un entorno controlado; no sustituyen la revisión visual o las interacciones reales a 360, 768 y 1440 px. No se certifican dimensiones, consola de hidratación, foco real ni importación manual en una aplicación de escritorio. No se realizaron benchmarks ni pruebas de carga en esta fase.

Las evidencias, archivos ICS/XLSX y scripts locales están en `.tmp/phase3/`, excluido de Git. Los tests mantenidos del backend están en `agenda.spec.ts` y `test/data-center.postgres.e2e-spec.ts`.

## Entorno y cierre

Se utilizó Node 24.21.0 y pnpm 10.34.5. Docker, PostgreSQL y Redis ya estaban saludables; se reutilizaron sin eliminar volúmenes ni regenerar datos. Se conservan las 20 cuentas, 40 matrículas y 37 matrículas activas. Solo la autenticación creó sesiones mediante su flujo habitual. No se añadieron migraciones ni índices.

El supervisor anterior de la aplicación ya no estaba activo al retomar la fase. Se inició el arranque oficial compilado después del build. Frontend y los cinco procesos backend permanecen activos en su terminal supervisada:

- Frontend y login: http://localhost:3000 y http://localhost:3000/login.
- Swagger principal: http://localhost:4100/api/docs.
- Salud de servicios: http://localhost:4100/api/v1/health/ready.
- Swagger internos: http://127.0.0.1:4001/api/docs, http://127.0.0.1:4002/api/docs, http://127.0.0.1:4003/api/docs y http://127.0.0.1:4004/api/docs.
- PostgreSQL: `127.0.0.1:55433/esapiens_demo_local`; Redis: `127.0.0.1:56379`.

Reinicio desde PowerShell en la raíz, con Docker disponible: `.\scripts\dev-demo.ps1`. Si se cambia código, recompilar primero con Node 24 y `pnpm.cmd build`.

Archivos de esta fase: componentes `portal-agenda`, `agenda-calendar`, `agenda-drawer`, `agenda-forms`, navegación y shell; nueva página `portal/[role]/agenda` y helpers `agenda-data`; controlador, módulo, DTO, servicio, proveedor de feriados y exportador iCalendar de agenda; proxy académico y contratos compartidos; pruebas y este informe junto con `ESTADO_ACTUAL_PROYECTO.md`.

El tercer commit local de la rama registra esta fase; consultar `git log -1`. No se hizo push ni merge. Pendiente: comprobación visual e interactiva con navegador conectado. La fase termina aquí.
