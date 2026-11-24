# E-SAPIENS — Guía de demostración de las cuatro fases

Versión local académica. Rama: `feat/ux-performance-calendar-assistant`.
Los resultados finales de pruebas y la situación del pull request constan en [FASE_4_ASISTENTE_CIERRE.md](FASE_4_ASISTENTE_CIERRE.md). Esta guía describe un recorrido; no acredita un despliegue de producción.

## Preparar la sesión

1. Abrir Docker Desktop y el proyecto en VS Code. Conservar el volumen y la base existentes. La instalación utiliza el proyecto `esapiens_demo_local`, PostgreSQL `127.0.0.1:55433/esapiens_demo_local` y Redis `127.0.0.1:56379`.
2. Consultar `CREDENCIALES_DEMO_LOCAL.txt` localmente. Contiene 20 cuentas ficticias: un administrador general, un administrador, tres docentes y quince estudiantes. No proyectar contraseñas ni añadir el archivo a Git. Usar una cuenta por perfil y cerrar sesión al cambiar, o utilizar perfiles de navegador separados.
3. Si ya están activos frontend y backend de esta copia, conservarlos. Para arrancarlos desde la raíz con sus compilaciones existentes:

   ```powershell
   .\scripts\dev-demo.ps1
   ```

4. El script selecciona Node 24.21.0 desde `%LOCALAPPDATA%\E-Sapiens\node-v24.21.0-win-x64`, si está instalado, y ejecuta `pnpm.cmd demo:start`. El proyecto requiere Node `>=24.15.0 <25` y pnpm 10.34.5. Si cambió código, seleccionar Node 24 en la terminal y ejecutar `pnpm.cmd build` antes de arrancar. Para trabajo con recarga, utilizar `pnpm.cmd dev`.
5. Comprobar la disponibilidad en http://localhost:4100/api/v1/health/ready antes de iniciar el recorrido. El gateway usa 4100; **no detener la aplicación ajena del puerto 4000**. Un formulario de login visible no demuestra por sí solo que los servicios estén listos.

No volver a ejecutar semillas para un reinicio normal. `pnpm.cmd setup:demo` prepara la infraestructura y el catálogo inicial de una instalación nueva; `pnpm.cmd demo:seed` prepara la demo completa y exige la base aislada. Su ejecución es repetible, pero la presentación existente ya dispone de cuentas, materias y actividades relacionadas. Conservar siempre las credenciales y la configuración local.

## Recorrido sugerido

### 1. Sitio público y acceso

Abrir [inicio](http://localhost:3000), [catálogo](http://localhost:3000/cursos) y [biblioteca](http://localhost:3000/biblioteca). Buscar una materia de contabilidad y abrir su temario. Iniciar sesión desde [login](http://localhost:3000/login) con una cuenta ficticia aprobada. El rol y los permisos de la cuenta determinan los accesos.

### 2. Administración y barra lateral

En [administración](http://localhost:3000/portal/administrador), entrar en **Gestión académica**. Mostrar el panel en este orden: resumen, pendientes, acciones rápidas e información detallada. Los datos corresponden a consultas reales sobre la base ficticia; no cambiar registros únicamente para rellenar indicadores.

Contraer y expandir la barra de escritorio. Abrir dos grupos de forma independiente y navegar a otra sección para mostrar que la preferencia permanece. La sección activa conserva su indicador; en modo compacto los iconos mantienen nombres accesibles. En móvil se utiliza el menú superpuesto. Cambiar entre Gestión académica y Aula virtual sin cerrar sesión.

| Sección administrativa                                                          | Qué mostrar                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [Usuarios](http://localhost:3000/portal/administrador/usuarios)                 | Buscar, filtrar estudiantes y descargar su Excel; el archivo respeta los filtros.                 |
| [Docentes y asignaciones](http://localhost:3000/portal/administrador/docentes)  | Perfiles, especialidades, asignaciones y descarga de docentes en Excel.                           |
| [Materias y temarios](http://localhost:3000/portal/administrador/cursos)        | Las cinco materias de contabilidad, módulos y contenidos.                                         |
| [Inscripciones](http://localhost:3000/portal/administrador/inscripciones)       | Solicitudes académicas y sus estados.                                                             |
| [Matrículas y acceso](http://localhost:3000/portal/administrador/matriculas)    | Relaciones estudiante–materia y permisos de acceso a módulos.                                     |
| [Solicitudes de cuenta](http://localhost:3000/portal/administrador/solicitudes) | Revisión de cuentas pendientes, si el usuario tiene `identity.review`.                            |
| [Pagos y planes](http://localhost:3000/portal/administrador/pagos)              | Referencias y revisión manual, si el usuario tiene `commerce.manage`. No existe cobro automático. |

No ejecutar aprobaciones o cambios de estado durante la muestra si solo se pretende consultar. La aprobación de cuenta, inscripción, matrícula y acceso al módulo son controles distintos.

### 3. Centro de Datos y archivos

Abrir [Centro de Datos](http://localhost:3000/portal/administrador/datos). Recorrer sus seis vistas: **Resumen, Estudiantes, Cursos, Docentes, Actividad web y Reportes**. Cambiar un filtro y explicar que los períodos afectan la actividad según las notas de la pantalla; no todos los conteos representan lo mismo. Mostrar los CSV disponibles sin duplicar los gráficos en otra pantalla.

Abrir un Excel descargado para comprobar encabezados, filtros y columnas. Administración puede exportar docentes y estudiantes; docencia exporta únicamente estudiantes de sus materias autorizadas. Los archivos contienen la información permitida por el perfil, sin habilitar acceso a otras personas mediante la descarga.

### 4. Docente

Entrar en [portal docente](http://localhost:3000/portal/docente) con una de las tres cuentas. Mostrar las entregas pendientes de nota y próximas clases del inicio del Aula virtual. Abrir **Mis aulas** y una materia asignada.

Recorrer Materiales, Tareas, Entregas y Evaluaciones. Abrir una entrega con calificación y otra pendiente; diferenciar comentarios de nota. Consultar **Mis estudiantes** y el avance. Usar **Exportar estudiantes a Excel** desde el listado docente para mostrar el alcance de sus materias.

Los formularios de tareas y evaluaciones indican errores junto al campo, muestran el guardado y bloquean envíos simultáneos. Solo publicar o calificar si se desea conservar ese cambio real en la demo. Ante un fallo se conserva el texto cuando el flujo lo permite; no se modificaron las reglas de notas ni intentos.

### 5. Estudiante

Entrar en [portal estudiante](http://localhost:3000/portal/estudiante). Elegir tres cuentas representativas con avances diferentes y comparar **Mi progreso**. Para cada cuenta, abrir una materia inscrita, una lección autorizada, una tarea y una evaluación disponible. Consultar las calificaciones existentes en **Mi cárdex** y los resultados accesibles de la materia.

En Gestión académica, mostrar **Inscribirme**, las solicitudes y **Planes y mis compras**. Las solicitudes no activan por sí solas una matrícula. Un módulo puede requerir autorización vigente o completar lecciones anteriores; respetar esas condiciones durante el recorrido.

### 6. Agenda y descarga iCalendar

Cada perfil dispone de `/portal/{perfil}/agenda`, con `administrador`, `docente` o `estudiante`. También puede abrir el calendario lateral desde el portal. El lateral conserva su vista compacta; la página completa muestra:

- Mes, semana y próximos 30 días, navegación a hoy y selección de mes/año.
- Día seleccionado, tipos y colores, filtros, cantidades y pendientes.
- Detalle del evento y enlace a su actividad autorizada.
- Recordatorios personales y descarga del período/filtro en `.ics`.

Mostrar clases, tareas y evaluaciones que existan para esa cuenta. En las evaluaciones, la agenda distingue la fecha de registro de un plazo: el modelo no tiene una fecha programada general; un intento propio en curso sí puede aportar su vencimiento real.

Los feriados informativos nacionales de Bolivia proceden de [Nager.Date v4](https://github.com/nager/Nager.Date/blob/main/doc/examples/rest-api.md): `https://nagerholidays.com/api/v4/Holidays/BO/{year}`. Se consultan desde el servidor, con validación, timeout de 2,5 segundos y caché por año. Los nombres se conservan tal como los entrega el proveedor; no se garantiza cobertura completa ni se añaden feriados inventados. Si falla la consulta, permanecen los eventos internos. No se reprograman clases ni entregas automáticamente.

Descargar el `.ics` del período actual. Usa horas UTC para eventos con hora, fechas de día completo y UID estables; incluye únicamente eventos autorizados. No ofrece sincronización bidireccional ni conexión OAuth con Google. Los detalles técnicos y las validaciones históricas están en [FASE_3_CALENDARIO.md](FASE_3_CALENDARIO.md).

### 7. Asistente E-SAPIENS

Dentro de un portal autenticado, abrir el botón flotante **Asistente E-SAPIENS**. El panel comienza cerrado y se carga cuando se necesita. Elegir una sugerencia, escribir una pregunta con pequeñas diferencias de escritura y abrir el enlace de ayuda permitido para el perfil.

Cambiar entre matrículas, Centro de Datos y una materia docente para revisar las sugerencias de contexto disponibles. Probar una consulta no reconocida y reiniciar la conversación. La ayuda usa una base local de preguntas frecuentes verificadas: no es inteligencia generativa, no envía conversaciones a servicios externos, no consulta notas privadas ni ejecuta aprobaciones, entregas o calificaciones. Los permisos del servidor siguen vigentes al abrir cualquier enlace.

## Direcciones de servicios

| Servicio              | Dirección                                         |
| --------------------- | ------------------------------------------------- |
| Frontend              | http://localhost:3000                             |
| Login                 | http://localhost:3000/login                       |
| Swagger principal     | http://localhost:4100/api/docs                    |
| OpenAPI principal     | http://localhost:4100/api/docs-json               |
| Salud conjunta        | http://localhost:4100/api/v1/health/ready         |
| Contenido             | http://127.0.0.1:4001/api/docs                    |
| Analítica             | http://127.0.0.1:4002/api/docs                    |
| Identidad             | http://127.0.0.1:4003/api/docs                    |
| Académico             | http://127.0.0.1:4004/api/docs                    |
| Agenda administrativa | http://localhost:3000/portal/administrador/agenda |
| Agenda docente        | http://localhost:3000/portal/docente/agenda       |
| Agenda estudiante     | http://localhost:3000/portal/estudiante/agenda    |

El gateway y los cuatro servicios HTTP internos son los cinco procesos backend existentes. No se añadieron servicios para el asistente. Swagger documenta operaciones reales: sus escrituras pueden modificar datos. No mostrar claves internas, cookies ni contraseñas en la presentación.

## Cierre y límites

Las mejoras de rendimiento se midieron en la fase 1 sobre la base local y con una muestra pequeña. Se redujeron consultas y algunas medianas, pero la mediana HTML del Centro de Datos no mejoró en aquella serie. No se extrapolan esos resultados a carga concurrente o producción. Consultar [FASE_1_ESTABILIZACION.md](FASE_1_ESTABILIZACION.md).

Las pruebas históricas de las fases 2 y 3 incluyen tipos, compilación, autorización, PostgreSQL y comprobaciones HTTP; sus resultados no sustituyen una ejecución nueva. La validación de integración final y cualquier pendiente real están en el informe de fase 4. Si no hay navegador conectado, las comprobaciones controladas de componentes y las peticiones HTTP no certifican foco real, consola de hidratación ni la presentación a 360, 768 y 1440 px; revisar esos tamaños manualmente antes de proyectar.

Mantener abierta la terminal supervisada durante la muestra. Al terminar, `Ctrl+C` detiene la web y los backend; los datos de Docker permanecen. Las cuentas ficticias y sus contraseñas son exclusivas de la base local y deben reemplazarse o desactivarse después de la demostración. No publicar la configuración privada ni los archivos de `.tmp/`.
