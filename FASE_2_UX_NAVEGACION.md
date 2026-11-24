# E-SAPIENS — Fase 2: experiencia de usuario y navegación

Fecha: 23/11/2026 (America/La_Paz).
Rama: `feat/ux-performance-calendar-assistant`.
Base de esta fase: `dfc7150`, commit local de la fase 1.

## Resultado implementado

Se conserva la rama y el trabajo de la fase 1. Esta entrega añade navegación desplegable, una jerarquía administrativa más clara y prioridades docentes con datos reales. No se ejecutaron reset, clean, pull, merge ni push. El segundo commit local se identifica mediante `git log -1`; no se inicia otra fase.

### Navegación y presentación

- En escritorio, la barra alterna entre 18 rem con iconos y texto y 5 rem con iconos, nombres accesibles y títulos al pasar el puntero. El control muestra «Expandir» o «Contraer» en pantallas amplias y conserva su nombre accesible en todas las variantes.
- La anchura de la barra y el espacio reservado al contenido comparten una variable CSS y una transición de 200 ms. Se respeta la preferencia de movimiento reducido.
- Los grupos se abren y cierran independientemente. Los botones indican su estado y controlan paneles con identificadores únicos; la página activa se distingue con color, borde y `aria-current`. Un grupo cerrado que contiene la página actual también queda identificado.
- La preferencia de barra y la de cada grupo se conservan al navegar y recargar mediante almacenamiento local. `useSyncExternalStore` utiliza un estado inicial de servidor estable; existe una alternativa en memoria cuando el almacenamiento falla. No se guardan datos académicos ni sesiones en estas preferencias.
- Buscar una sección muestra sus resultados aunque su grupo estuviera cerrado. El modo compacto conserva todos los enlaces disponibles.
- Se mantiene el diálogo móvil existente, su cierre, el botón de menú y la restauración del foco. Gestión académica y Aula virtual conservan sus rutas y sus permisos.
- Las tablas de usuarios y del Centro de Datos permiten enfocar su contenedor y desplazarlo horizontalmente mediante teclado.

### Administración

El panel presenta **resumen → pendientes → acciones rápidas → información detallada**. Las solicitudes de inscripción, entregas por calificar y pagos se separan de los indicadores generales. Los accesos a pagos y solicitudes de cuenta respetan los permisos correspondientes.

Se reubican los accesos a estudiantes, docentes, materias y reportes. Los filtros de personas tienen un bloque propio, explicación de su relación con el Excel y un enlace para limpiarlos. Los estados correctos, pendientes y rechazados/suspendidos/cancelados emplean los colores semánticos existentes.

Se conservan los indicadores, gráficos, seis vistas del Centro de Datos y exportaciones Excel/CSV. No se añadieron gráficos duplicados ni otro módulo administrativo.

### Docentes y formularios

El inicio docente y el inicio del Aula virtual muestran primero:

- Las últimas entregas de tareas publicadas que todavía no tienen nota, agrupadas por materia, con acceso a sus tareas.
- Las tres próximas clases programadas, con fecha en la zona horaria del usuario y acceso a su materia.
- Las solicitudes de inscripción pendientes y el acceso a estudiantes y calificaciones.

Se amplía la respuesta existente de `academic/overview/docente` con una consulta SQL adicional. El ámbito se limita a materias asignadas al usuario antes de agregar datos. No se añadió un endpoint, servicio, caché ni migración. Se conserva la consulta optimizada de progreso de la fase 1.

Las tareas muestran cuántas entregas hay y cuántas carecen de comentarios; ese dato se distingue de las entregas pendientes de nota. El editor de una tarea mantiene su identidad al cambiar la revisión para conservar la confirmación del guardado.

Los formularios de tareas y evaluaciones añaden errores junto al campo, `aria-invalid` y su descripción asociada. Se mantienen los estados de guardado y el bloqueo inmediato de solicitudes simultáneas. Las evaluaciones bloquean la edición mientras se publican y comprueban que la tercera opción esté completa si se marca como correcta. Los formularios nuevos se limpian únicamente después de una respuesta correcta; ante un fallo conservan el texto y las preguntas. Los errores generales se anuncian como alertas.

No cambian las reglas de notas, intentos ni autorización del servidor.

## Validación ejecutada

| Comprobación                                          | Resultado                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Tipos de API y web                                    | Aprobados                                                                 |
| Build completo de API y web                           | Aprobado                                                                  |
| Lint de los componentes web modificados               | Sin errores ni advertencias                                               |
| Lint de API                                           | Sin errores; permanecen las dos advertencias previas del exportador Excel |
| Pruebas unitarias LMS de autorización y operaciones   | 20 aprobadas                                                              |
| PostgreSQL, Centro de Datos y regresiones académicas  | 10 aprobadas, con rollback                                                |
| Componentes SSR y lógica cliente                      | 36 comprobaciones aprobadas                                               |
| Recorridos y autorizaciones mediante HTTP             | 193 comprobaciones aprobadas                                              |
| Contraste de colores semánticos, temas claro y oscuro | 14 pares con relación ≥ 4,5:1; mínimo 4,515:1                             |

La regresión PostgreSQL nueva comprueba ámbito docente, último intento sin calificar, exclusión de tareas sin publicar, límite y orden de clases futuras y rechazo de un rol estudiante. La prueba de componentes comprueba renderizado inicial, enlaces por rol, identificadores accesibles, persistencia y fallos del almacenamiento, envíos simultáneos y conservación/limpieza de formularios. Estas comprobaciones de lógica usan dobles controlados y no sustituyen una interacción en navegador.

Las comprobaciones HTTP incluyen los 20 logins, páginas y enlaces de navegación de los tres perfiles, prioridades de los tres docentes contrastadas con PostgreSQL, seis vistas del Centro de Datos, matrículas, lecciones, tareas, evaluaciones, Excel descargados y reabiertos, CSV y rechazos 401/403/404. Los primeros siete fallos del comprobador procedían de literales acentuados convertidos a ASCII al crear el script temporal; se corrigió el comprobador y se repitieron únicamente esas siete comprobaciones, sin modificar el producto.

Las evidencias están en `.tmp/phase2/`, excluido de Git: `verification.json`, `verification-first-run.json`, `ux-checks.json`, `contrast.json`, `build.log` y `runtime.log`.

### Responsive y límites de la revisión

| Anchura solicitada | Comportamiento definido en el código                                                               | Verificación disponible                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 360 px             | Menú móvil superpuesto, barra inferior, tarjetas en una columna y tablas con desplazamiento propio | Revisión de CSS y componentes; falta inspección visual        |
| 768 px             | Menú móvil superpuesto y rejillas adaptadas a tableta                                              | Revisión de CSS y componentes; falta inspección visual        |
| 1440 px            | Barra lateral expandida/compacta con espacio reservado al contenido                                | Invariantes CSS y estado comprobados; falta inspección visual |

El navegador automatizado no está conectado: la selección indicó `No browser is available` y la lista disponible estaba vacía. No se certifican capturas, ausencia de errores de hidratación en consola, tabulación real, cierre con Escape, foco del diálogo ni dimensiones de elementos en esos tres tamaños. Los nombres, relaciones ARIA, reglas de foco, semántica de diálogo y contraste se revisaron por código, SSR y cálculo de colores. Tampoco se ejecutaron pruebas de carga ni nuevas mediciones de rendimiento en esta fase.

## Entorno al cierre

Se utilizó Node 24.21.0 y pnpm 10.34.5, sin instalar dependencias. Se recompiló y reinició únicamente el supervisor de E-SAPIENS para cargar esta versión. PostgreSQL y Redis permanecieron activos; no se eliminaron volúmenes, regeneraron cuentas ni ejecutaron seeds. Se conservan 20 cuentas y 40 matrículas, 37 activas.

Frontend: http://localhost:3000. Login: http://localhost:3000/login.
Administración: http://localhost:3000/portal/administrador.
Docente: http://localhost:3000/portal/docente.
Centro de Datos: http://localhost:3000/portal/administrador/datos.
Gateway y Swagger: http://localhost:4100/api/docs.
Salud: http://localhost:4100/api/v1/health/ready.

Los cinco procesos backend y el frontend compilado siguen supervisados por la terminal del arranque. Las direcciones adicionales permanecen en `ESTADO_ACTUAL_PROYECTO.md`. Para arrancarlos de nuevo desde la raíz, con Docker disponible:

```powershell
.\scripts\dev-demo.ps1
```

## Archivos modificados

- Navegación: `portal-shell.tsx`, `portal-navigation.tsx`, nuevo `use-portal-preference.ts`, `logout-button.tsx` y `app/globals.css`.
- Administración: `admin-dashboard.tsx`, `data-center.tsx`, `people-filters.tsx` y estados compartidos en `portal-ui.tsx`.
- Docentes y formularios: nuevo `teacher-attention.tsx`, `teaching/forms.tsx`, `teaching/workspace.tsx`, `evaluation-forms.tsx`, nuevo `use-form-errors.tsx` y `academic-action.tsx`.
- Integración: páginas del portal, validador en `portal/server.ts`, contrato `AcademicOverview`, `academic.service.ts` y regresión en `data-center.postgres.e2e-spec.ts`.
- Documentación: este informe y `ESTADO_ACTUAL_PROYECTO.md`.

Pendiente: comprobación visual e interactiva en navegador conectado. La implementación y las verificaciones disponibles terminan aquí, sin iniciar la siguiente fase.
