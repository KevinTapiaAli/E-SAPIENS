# Dashboard ejecutivo y calendario lateral

Entrega del 07/10/2026. Implementación revisada mediante lectura de código;
no se ejecutaron web, navegador, API, migraciones, lint, typecheck, build ni pruebas.
El formato de los archivos se realiza como edición, sin ejecutar la aplicación.

## Activación

Antes de arrancar esta versión, aplicar la migración incremental **0008** con
`pnpm.cmd db:migrate` desde la raíz del monorepo. No se ejecutó en esta entrega.
Añade medición agregada y atribución opcional; conserva cuentas, matrículas y
actividad existentes. No añade dependencias ni requiere nuevas variables de entorno.
El despliegue debe aplicar la migración antes de reemplazar la API.

La portada de administración pasa a ser **Panel ejecutivo**. «Análisis académico»
conserva las consultas detalladas existentes. Docentes y estudiantes conservan
sus interacciones e inicio. El carrusel institucional permanece disponible.

## Indicadores y decisiones

| Indicador                             | Definición y límites                                                                                                                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitantes únicos estimados           | Identificadores de navegador distintos en el periodo completo. No es un censo de personas, no suma únicos diarios.                                                                                                                                  |
| Materias más consultadas              | Hasta seis fichas públicas ordenadas por navegadores únicos. Solo materias publicadas pueden registrar una nueva visita.                                                                                                                            |
| Conversión a solicitud de cuenta      | Navegadores medidos con cuenta web creada después de su primera visita / visitantes medidos del periodo. Un correo existente no vuelve a sumar.                                                                                                     |
| Conversión a solicitud de inscripción | Navegadores con solicitud real posterior a consultar cursos/oferta / navegadores que consultaron esa oferta en el periodo. Varias solicitudes del mismo navegador cuentan una conversión.                                                           |
| Solicitudes de inscripción            | Solicitudes de negocio creadas en el periodo, con o sin atribución. No equivalen a matrículas aprobadas.                                                                                                                                            |
| Solicitudes de cuenta web             | Cuentas con historial «Solicitud de registro web» creadas en el periodo; excluye altas administrativas.                                                                                                                                             |
| Estudiantes activos semanalmente      | Personas actualmente aprobadas y con matrícula activa que iniciaron/completaron lecciones, entregaron tareas o tuvieron asistencia verificada durante los últimos siete días. Comparación con los siete anteriores sobre la misma población actual. |
| Estudiantes sin actividad             | Estudiantes de esa población con al menos 14 días desde su primera matrícula activa y sin acciones académicas registradas en esos 14 días.                                                                                                          |
| Sin actividad desde ingreso           | Personas matriculadas sin ninguna de las acciones anteriores, incluidos ingresos recientes. No son automáticamente inactivos por 14 días.                                                                                                           |
| Pendientes de calificar               | Última versión por estudiante/tarea sin nota. No duplica versiones anteriores.                                                                                                                                                                      |
| Materias sin docente habilitado       | Materias publicadas sin una persona asignada, aprobada y con rol docente.                                                                                                                                                                           |

Captación ofrece ventanas de **7, 30 o 90 días completos en UTC**, excluyendo el
día en curso. Las comparaciones tienen duración equivalente. Los visitantes de
hoy se incluyen cuando termina el día UTC. El bloque operativo es una consulta
actual; el periodo seleccionado no cambia sus pendientes ni sus ventanas semanales.
El panel muestra cuándo se consultaron los datos y cuándo comenzó la medición.

Las recomendaciones enlazan a cuentas, asignaciones, solicitudes, materias y
seguimiento. Los estudiantes para contactar se limitan a ocho, priorizando falta
de actividad y fechas antiguas; el enlace abre su matrícula activa más antigua.
Las sugerencias son reglas explicables, no predicciones ni cambios automáticos.
Una señal de visitas sin conversiones requiere periodo cubierto y al menos 30
navegadores. No hay objetivos, umbrales comerciales o tasas de referencia inventados.

## Medición y seguridad

- `POST /api/v1/analytics/visit` acepta únicamente rutas permitidas; no acepta
  eventos de conversión ni cifras calculadas por el cliente. `/oferta` exige sesión
  de estudiante. Las materias se resuelven por slug publicado.
- Next.js envía visitas desde páginas visibles después de un segundo. El renderizado
  del servidor, las precargas y una pestaña oculta no generan visitas.
- Cookie propia HttpOnly, SameSite=Lax y Secure sobre HTTPS, con token aleatorio
  de 30 días. PostgreSQL conserva su hash; no guarda IP, agente de navegador,
  términos de búsqueda ni URL completa. El token se oculta en logs HTTP.
- El pie público y el portal permiten desactivar medición. Se respetan DNT/GPC;
  la exclusión impide medir y atribuir nuevas solicitudes. No impide usar el LMS.
- Los proxies no reenvían el identificador libremente suministrado en cabeceras:
  extraen su propia cookie. Las conversiones nacen de inserciones reales y la
  atribución se guarda en la misma transacción, conservando la idempotencia.
- Redis limita visitas por identificador y de forma global entre réplicas de API.
  Si Redis no está disponible, la telemetría se omite. La medición sigue siendo
  aproximada: cookies bloqueadas/borradas, dispositivos distintos, automatizaciones,
  fallos de red o señales excluidas afectan su cobertura.
- `GET /api/v1/analytics/dashboard?days=7|30|90` exige sesión administrativa,
  `dashboard.admin` y `academic.read`; devuelve solo agregados y hasta ocho
  estudiantes para seguimiento. No hay caché compartida de respuestas privadas.
- SQL parametrizado, agregación diaria con clave única, límites en rankings y
  cohortes deduplicadas. No se crearon índices especulativos sobre tablas existentes;
  revisar planes de consulta con datos representativos queda fuera de esta entrega.

No se reconstruyen visitas antiguas ni se infieren conversiones a partir de clics.
Una conversión fuera del periodo no se atribuye retroactivamente; la cuenta puede
crearse en un dispositivo y la inscripción en otro. El panel explica estas limitaciones.

## Retención

El comando `pnpm.cmd analytics:prune` elimina filas de visitas con más de 190 días
y retira atribuciones antiguas de cuentas/solicitudes sin borrar los registros de
negocio. Procesa hasta 10 000 filas de cada tabla por ejecución, en transacción.
Debe programarse diariamente en el entorno de despliegue y repetirse si existe
acumulación superior al lote. Esta entrega deja el comando, no crea un cron ni
ejecuta ninguna limpieza. No se garantiza retención automática sin esa programación.

## Calendario lateral

Disponible en todo el portal de los tres perfiles, cerrado por defecto y con botón
en el borde derecho. Al abrirlo carga el componente y consulta su API; al cerrarlo
desmonta el calendario y cancela la lectura pendiente. Diálogo nativo con Escape,
botón de cierre, foco contenido, devolución de foco y fondo sin desplazamiento.

Cambiar mes, deslizar, seleccionar día y guardar/completar recordatorios actualiza
solo la agenda. No navega el dashboard ni reinicia las interacciones del inicio.
Conserva zona horaria, permisos, clases y hasta ocho avisos de tareas/recordatorios
pendientes de los próximos 30 días. Los avisos se actualizan al abrir la agenda,
cambiar su selección o guardar un recordatorio; no hay notificaciones externas.

Código organizado en `modules/analytics` (API), `features/analytics` (web), contratos
compartidos y componentes de agenda en `features/portal`. Decisión:
[ADR 0008](adr/0008-executive-dashboard.md).
