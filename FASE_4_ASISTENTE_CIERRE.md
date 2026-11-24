# E-SAPIENS — Fase 4: asistente de ayuda y cierre integral

Fecha de trabajo: 23/11/2026 (America/La_Paz). Rama: `feat/ux-performance-calendar-assistant`.
Base de esta fase: `2f0b982`. Esta entrega conserva las fases 1, 2 y 3; no acredita un despliegue de producción.

## 1. Rendimiento conservado

La fase 1 paralelizó las lecturas del espacio docente y redujo consultas de curso/módulos (2→1), evaluaciones (3→2) y Centro de Datos (4→2). Se agruparon entregas/asistencias por matrícula y se omitieron agregaciones no usadas por el CSV. No se añadieron índices ni migraciones sin evidencia, ni cachés públicas con información privada.

Las medianas HTTP históricas de la misma demo pasaron de 45,20 a 30,92 ms en materiales docentes y de 46,47 a 34,82 ms en la API del Centro de Datos. La página HTML del Centro de Datos no mejoró su mediana (64,29→68,99 ms). Son muestras locales pequeñas; no se repitieron benchmarks en esta fase ni se afirma rendimiento en producción. Método, planes y resultados: [FASE_1_ESTABILIZACION.md](FASE_1_ESTABILIZACION.md).

## 2. Administración, docencia y navegación

Se conservan el panel organizado por resumen, pendientes, acciones rápidas e información detallada; filtros, estados, Centro de Datos de seis vistas y exportaciones XLSX/CSV. El portal docente prioriza entregas sin calificar, próximas clases e inscripciones. Los formularios conservan validaciones, estado de guardado, errores junto a campos y confirmación real, sin cambiar calificaciones ni autorizaciones.

La barra lateral de escritorio permite expandir/contraer y abrir grupos independientemente, marca la ruta activa y conserva preferencias locales sin alterar la hidratación inicial. El menú superpuesto móvil y el cambio entre Gestión académica y Aula virtual permanecen. Detalle: [FASE_2_UX_NAVEGACION.md](FASE_2_UX_NAVEGACION.md).

## 3. Calendario y proveedor

La agenda existente ofrece mes, semana y próximos 30 días, filtros, colores, día seleccionado, detalle, pendientes, recordatorios y descarga `.ics`. Reutiliza `/academic/agenda`, mantiene el contrato anterior sin `view` y limita las lecturas a períodos acotados con selección local del día.

Los feriados nacionales informativos de Bolivia se consultan desde el servicio académico mediante `https://nagerholidays.com/api/v4/Holidays/BO/{year}`. Se validan las respuestas, con timeout de 2,5 segundos, caché por año de 24 horas para éxito y 5 minutos para fallo. La agenda interna funciona independientemente del proveedor. Los nombres y cobertura son los suministrados por Nager.Date; no se inventan ni se cambian fechas académicas.

El iCalendar usa UID estables y opacos, texto escapado, líneas UTF-8 plegadas, fechas UTC o de día completo y únicamente eventos autorizados. No hay sincronización bidireccional ni OAuth. El modelo no tiene fecha programada general de evaluación: se identifica la fecha de registro o el vencimiento real de un intento propio, sin presentarlas como un plazo inventado. Fuentes, API y límites: [FASE_3_CALENDARIO.md](FASE_3_CALENDARIO.md).

## 4. Asistente E-SAPIENS

El botón flotante «Ayuda» abre un diálogo «Asistente E-SAPIENS» en los portales autenticados. Comienza cerrado; la conversación y la FAQ se importan dinámicamente al abrirlo. Ofrece bienvenida, cuatro preguntas sugeridas según rol y página, entrada de texto, respuesta breve, enlace de navegación, ayuda ante consultas desconocidas y reinicio.

La base local contiene 24 temas verificados, ocho por perfil:

- Administración: crear usuarios, solicitudes de cuenta, asignar docentes, administrar materias, matrículas/autorizaciones, Centro de Datos, informes y pagos manuales.
- Docentes: materias/estudiantes, materiales, tareas, entregas, calificación, evaluaciones, resultados y calendario.
- Estudiantes: materias, solicitud de inscripción, lecciones, entregas, calificaciones, evaluaciones, progreso y compras/inscripciones.

La búsqueda normaliza acentos y mayúsculas, tolera pequeños errores de escritura y rechaza coincidencias insuficientes o ambiguas. No usa inteligencia generativa ni inventa respuestas. Los textos se muestran como texto React escapado.

Los enlaces proceden de `portalNavigation` y se filtran también por los permisos de la operación. Un UUID en la URL no demuestra pertenencia: para actividades de una materia, el asistente conduce a la lista autorizada «Mis aulas» y explica qué sección abrir. No consulta matrículas, notas ni otra información privada para contestar.

La conversación permanece únicamente en memoria del componente, con un máximo de 20 intercambios y 240 caracteres por consulta. Se conserva al cerrar/abrir en la misma página; se reinicia al cambiar de ruta o perfil. No se guarda en localStorage, no se envía a servicios internos/externos y no ejecuta aprobaciones, pagos, entregas ni calificaciones. Los enlaces tienen prefetch desactivado. No se añadieron dependencias.

El diálogo utiliza cierre con botón, fondo y Escape nativo, nombres/etiquetas accesibles, registro de respuestas anunciado y devolución de foco al disparador. El CSS limita el panel al viewport, reserva espacio sobre la navegación móvil y evita solaparse con el disparador del calendario. Estas reglas fueron comprobadas por código y pruebas controladas; falta validarlas visualmente en un navegador real.

## 5. Validación final

| Comprobación                                    | Resultado                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Unitarias API                                   | 110 aprobadas en 13 suites                                                                                            |
| Integración E2E completa                        | 78 aprobadas en 6 suites                                                                                              |
| FAQ mantenida con `node:test`                   | 74 aprobadas                                                                                                          |
| UI de ayuda, manejadores/SSR/CSS controlados    | 27 comprobaciones aprobadas                                                                                           |
| Tipos de API y web                              | Aprobados                                                                                                             |
| Lint completo                                   | Sin errores; correcciones dirigidas de advertencias nuevas y dos advertencias previas en Excel                        |
| Build completo                                  | API y web aprobados; frontend recompilado después de las correcciones finales de permisos                             |
| HTTP de portales, autenticación y exportaciones | 196 comprobaciones aprobadas: 20 logins, portales, seis vistas del Centro de Datos, XLSX/CSV y permisos               |
| HTTP de agenda y archivos iCalendar             | 142 comprobaciones aprobadas; descargas abiertas con parser independiente                                             |
| HTTP de ayuda, rutas y carga inicial            | 80 comprobaciones aprobadas                                                                                           |
| Enlaces de actividades de los ICS               | 12 rutas autorizadas respondieron correctamente                                                                       |
| Formato de todo el repositorio                  | `pnpm format:check` aprobado                                                                                          |
| Revisión de archivos/secretos                   | Sin archivos privados o temporales ni secretos locales conocidos en el diff preparado y commits anteriores de la rama |

Las suites E2E usan transacciones, savepoints y rollback. Se compararon los conteos de las 84 tablas antes/después sin diferencias: 20 usuarios, 5 materias, 40 matrículas y 37 activas. Se adaptaron únicamente las guardas de dos pruebas para admitir también `esapiens_demo_local` en el puerto 55433, manteniendo restricciones de host, entorno y producción. Las claves Redis de las fixtures son aisladas, aleatorias y con expiración; no se vació Redis.

La revisión detectó y corrigió los requisitos de permiso de tres temas: compras estudiantiles exige `classroom.study`; progreso y cárdex exigen `dashboard.student`, como sus servicios. Se probaron perfiles sin permisos y permisos parciales para impedir accesos sugeridos que el servidor rechazaría. Se mantienen controles 401/403 y el alcance de las consultas originales.

La ayuda y FAQ se generaron en un chunk independiente de 19.331 bytes (6.491 bytes al comprimir con gzip localmente). No aparece entre los scripts de carga inicial de los portales comprobados y no se monta la conversación antes de abrir. Estas cifras describen el artefacto generado; no son una medición de red de navegador ni un benchmark de carga.

El navegador conectado continúa sin estar disponible (`No browser is available`; lista vacía). Las pruebas de manejadores, SSR e invariantes CSS a 360/768/1440 px no certifican dimensiones reales, navegación con teclado, foco, consola de hidratación ni importación manual en Excel o una aplicación de calendario. Se usan parsers independientes para XLSX/ICS en las verificaciones HTTP. Tampoco se verificó producción o carga concurrente.

Evidencias no sensibles de ejecución y scripts de comprobación locales: `.tmp/phase4/`, ignorado por Git. La prueba reproducible de la FAQ queda versionada en `apps/web/test/help-assistant.test.cjs`.

## 6. Archivos de la fase

- `apps/web/src/features/portal/help-assistant.tsx`: disparador, diálogo y carga bajo demanda.
- `help-conversation.tsx`, `help-assistant-data.ts` y `help-assistant.module.css`: conversación, FAQ/búsqueda y presentación.
- `portal-shell.tsx`: integración por usuario y perfil, sin exponer datos personales al componente.
- `apps/web/test/help-assistant.test.cjs` y `apps/web/package.json`: pruebas mantenidas y comando `test`, sin nuevas dependencias.
- `apps/api/test/identity.e2e-spec.ts` y `public-catalog.e2e-spec.ts`: admisión restringida de la demo para pruebas con rollback.
- `README.md`: entrega, ejecución y diagrama existente actualizado con FAQ cliente y feriados desde académico.
- [GUIA_DEMOSTRACION_FINAL.md](GUIA_DEMOSTRACION_FINAL.md), [ESTADO_ACTUAL_PROYECTO.md](ESTADO_ACTUAL_PROYECTO.md), este informe y [PULL_REQUEST_FASES_1_4.md](PULL_REQUEST_FASES_1_4.md): recorrido y cierre revisable.

El chequeo global de formato detectó tres informes históricos y una línea de `scripts/database.mjs` de las fases anteriores. Se normalizó únicamente su formato para superar la comprobación del repositorio; el contenido histórico y la lógica del script se conservan. `node --check scripts/database.mjs` aprobó. Las credenciales, configuración privada y temporales permanecen fuera de Git.

## 7. Ejecución y demostración

Con Docker Desktop disponible y Node 24.21.0/pnpm 10.34.5, desde PowerShell en la raíz:

```powershell
.\scripts\dev-demo.ps1
```

El script usa el build existente. Si se modifica código, seleccionar Node 24 y ejecutar `pnpm.cmd build` antes de arrancar. Para desarrollar, `pnpm.cmd dev`. No volver a sembrar una demo existente para reiniciarla; las cuentas están en `CREDENCIALES_DEMO_LOCAL.txt`, excluido de Git.

- Frontend/login: http://localhost:3000 y http://localhost:3000/login.
- Portales: `/portal/administrador`, `/portal/docente` y `/portal/estudiante` en ese frontend.
- Agenda: `/portal/{perfil}/agenda`; ayuda: botón flotante dentro de cada portal.
- Centro de Datos: http://localhost:3000/portal/administrador/datos.
- Swagger/salud: http://localhost:4100/api/docs y http://localhost:4100/api/v1/health/ready.
- Swagger internos: puertos 4001, 4002, 4003 y 4004 de `127.0.0.1`, ruta `/api/docs`.
- PostgreSQL `127.0.0.1:55433/esapiens_demo_local`; Redis `127.0.0.1:56379`.

El frontend compilado y los cinco procesos backend permanecen activos en la terminal persistente del supervisor oficial al cierre. Se recompiló el frontend tras las correcciones finales y se reinició únicamente el supervisor de esta copia; PostgreSQL y Redis se conservaron. No se ejecutaron seeds, eliminaron volúmenes ni modificaron aplicaciones ajenas. El puerto 4000 pertenece a otra aplicación y no se modificó. El recorrido detallado y todas las direcciones están en la guía final.

## 8. Commits y propuesta de integración

Se conservan `dfc7150` (fase 1), `2f31c35` (fase 2) y `2f0b982` (fase 3). El cuarto commit registra esta fase en la misma rama; consultar `git log -4` para el historial final.

Se verificó `origin/main` en `d0cb345`, sin pull ni merge. El PR #15 sigue abierto: sus 41 archivos incluyen 25 idénticos a la base local de esta fase, 14 presentes y ampliados, y dos informes históricos ausentes. Todas sus funciones existen y no se creó otro Centro de Datos. El PR final consolidaría/sucedería ese trabajo y debe declarar el solapamiento, no fusionarse a ciegas como cambio independiente.

La propuesta completa hacia `main` está preparada en [PULL_REQUEST_FASES_1_4.md](PULL_REQUEST_FASES_1_4.md). **No se publicó**: el repositorio generó un preview Vercel real para el PR #15 y publicar esta rama puede disparar otro, mientras sigue vigente la instrucción previa de no desplegar en Vercel. No se alteró esa integración ni el PR ajeno. No existe URL de un PR nuevo; publicación y tratamiento del solapamiento quedan pendientes.

Pendientes al cierre de la fase 4: revisión visual/interactiva en navegador conectado y publicación de la propuesta bajo las condiciones anteriores. No se afirma funcionamiento en producción.

### Actualización de publicación — 24/11/2026

El usuario autorizó expresamente subir únicamente la rama de trabajo y crear un PR hacia `main`, sin force ni merge automático. Se revisaron de nuevo los commits, la base remota y el PR #15, conservando sus funcionalidades. Esta orden sustituye la pausa de publicación descrita en el cierre histórico anterior. El título/cuerpo actualizados y las condiciones de publicación están en [PULL_REQUEST_FASES_1_4.md](PULL_REQUEST_FASES_1_4.md); el resultado remoto se entrega al concluir. No se modifica la configuración de despliegue ni se certifica producción.
