# E-SAPIENS — Estado actual del proyecto

**Fecha de revisión:** 23 de noviembre de 2026, zona America/La_Paz.
**Alcance:** rama de trabajo local derivada de `main`; este documento no certifica el estado del despliegue remoto.

## 1. Resumen

El proyecto contiene las mejoras locales de administración, Centro de Datos, exportaciones Excel y preparación de una demostración académica con cuentas y materias ficticias. La fase 1 volvió a validar los recorridos principales el **23 de noviembre de 2026** y aplicó optimizaciones medidas de frontend y PostgreSQL.

**La entrega integra las cuatro fases.** Conserva las optimizaciones, navegación y portales anteriores, la agenda con tres vistas, feriados informativos de Bolivia y exportación iCalendar. Incorpora el Asistente E-SAPIENS con ayuda local por rol y página. Estado final de ejecución, pruebas y propuesta de integración: [FASE_4_ASISTENTE_CIERRE.md](FASE_4_ASISTENTE_CIERRE.md). Recorrido: [GUIA_DEMOSTRACION_FINAL.md](GUIA_DEMOSTRACION_FINAL.md).

## 2. Repositorio y arquitectura

| Elemento                                   | Estado                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| Rama local                                 | `feat/ux-performance-calendar-assistant`                                        |
| Commit base de la fase                     | `d0cb345` — Merge pull request #14                                              |
| Implementación posterior                   | Fases 1, 2, 3 y 4 en commits locales de la misma rama; consultar `git log -4`   |
| PR #15                                     | Funcionalidades compatibles incorporadas localmente; no se realizó merge remoto |
| Operaciones remotas de esta implementación | Sin push ni despliegue                                                          |
| Frontend                                   | Next.js y React, en `apps/web`                                                  |
| Backend                                    | NestJS, en `apps/api`                                                           |
| Servicios                                  | Gateway, identidad, académico, contenido y analítica                            |
| Persistencia                               | PostgreSQL compartido por los servicios de dominio y Redis                      |
| Contratos                                  | Tipos compartidos en `packages/contracts`                                       |

Se mantiene la arquitectura existente: el gateway delega por HTTP y no abre conexiones SQL. No se añadieron microservicios.

## 3. Implementación disponible

### Administración

- Dashboard con tarjetas, iconos y acentos azules y violetas.
- Indicadores de estudiantes, docentes, administradores, materias, matrículas, solicitudes, actividad, evaluaciones, entregas por calificar y pagos pendientes.
- Gráficos de estudiantes por materia, estados de matrícula, actividad académica, asignaciones docentes y evolución de inscripciones.
- Consultas reales a PostgreSQL, sin cifras de demostración incrustadas en la interfaz.
- Búsqueda y filtros administrativos de personas.
- Barra lateral expandida/compacta con preferencias persistentes, grupos independientes y navegación móvil conservada.
- Panel organizado por resumen, pendientes, acciones rápidas e información detallada; filtros de personas con limpieza y estados semánticos consistentes.

### Centro de Datos

Se incorporaron las seis vistas del PR #15: **Resumen, Estudiantes, Cursos, Docentes, Actividad web y Reportes**. Incluyen consultas, filtros, paginación, gráficos y exportación CSV. Se conservaron los controles de sesión y permisos del gateway.

### Excel

| Exportación             | Acceso                                  | Datos                                                                          |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| Docentes                | Administración → Docentes               | Nombre, correo, especialidad, estado, materias y cantidad de materias          |
| Estudiantes             | Administración → Usuarios → Estudiantes | Nombre, correo, estado, materias, cantidad de matrículas y progreso            |
| Estudiantes del docente | Materia o seguimiento docente           | Materia, estudiante, correo, estado de matrícula, progreso y notas disponibles |

Los archivos son `.xlsx` auténticos, generados con ExcelJS. Incluyen encabezados, autofiltros y cabecera fija. Las exportaciones administrativas respetan búsqueda y estado; las docentes comprueban la asignación de materias en el backend. Las celdas de texto cuentan con protección frente a inyección de fórmulas.

### Portales académicos

- Docentes: materias asignadas, materiales, tareas, entregas, calificaciones, evaluaciones, seguimiento y Excel.
- Estudiantes: materias matriculadas, lecciones autorizadas, progreso, tareas, evaluaciones y resultados.
- Mejoras del PR #15 para mostrar avance, estados y disponibilidad de intentos de evaluación.
- Permanecen las comprobaciones de rol, propiedad de materias, matrícula y acceso a módulos.
- Inicio docente con últimas entregas sin nota, solicitudes pendientes y próximas clases de sus materias; formularios de tareas y evaluaciones con errores junto al campo y conservación del texto ante fallos.

### Calendario y ayuda

La agenda completa en `/portal/{perfil}/agenda` ofrece mes, semana, próximos eventos, filtros, pendientes y descarga `.ics`. Conserva el calendario lateral compacto. Los feriados proceden de Nager.Date v4 desde el servidor y no modifican fechas académicas; su fallo no bloquea eventos internos. Detalle: [FASE_3_CALENDARIO.md](FASE_3_CALENDARIO.md).

El botón flotante «Ayuda» abre el Asistente E-SAPIENS bajo demanda, dentro de los portales autenticados. Sus 24 FAQ verificadas ofrecen sugerencias contextuales, búsqueda tolerante, enlaces permitidos y reinicio. No usa IA externa, no envía consultas a red, no almacena conversaciones ni ejecuta acciones administrativas o académicas. Las rutas se filtran por permisos sin asumir pertenencia por el UUID de la página.

## 4. Datos de demostración

**Datos de la demostración preparada el 20/11/2026, conservados y comprobados nuevamente contra PostgreSQL durante la fase 1 del 23/11/2026.** No se ejecutó nuevamente el seed ni se sustituyeron las cuentas existentes.

| Elemento                            | Último valor comprobado |
| ----------------------------------- | ----------------------: |
| Administrador general               |                       1 |
| Administrador                       |                       1 |
| Docentes                            |                       3 |
| Estudiantes                         |                      15 |
| Total de cuentas aprobadas          |                      20 |
| Materias publicadas                 |                       5 |
| Matrículas totales / activas        |                 40 / 37 |
| Lecciones                           |                      28 |
| Tareas publicadas                   |                      10 |
| Intentos de evaluación resueltos    |                      49 |
| Solicitudes pendientes              |                       3 |
| Entregas pendientes de calificación |                      22 |
| Pagos pendientes                    |                       0 |

Los valores reflejan también las operaciones reales realizadas durante la validación; no son únicamente los registros iniciales del seed.

| Materia                              | Docente             | Matriculados | Activos |
| ------------------------------------ | ------------------- | -----------: | ------: |
| Contabilidad Básica I                | Lucía Paredes Soto  |           15 |      15 |
| Contabilidad de Costos               | Andrés Rojas Molina |            6 |       5 |
| Elaboración de Estados Financieros   | Lucía Paredes Soto  |            7 |       6 |
| Análisis e Interpretación Financiera | Andrés Rojas Molina |            6 |       5 |
| Auditoría Contable I                 | Camila Vargas León  |            6 |       6 |

Las materias contienen módulos, lecturas originales, ejemplos, actividades, tareas y evaluaciones. Para mostrar avances distintos en Contabilidad Básica se prepararon Daniela Fuentes (100 %), Mateo Castro (50 %) y Sofía Navarro (17 %). La matrícula adicional respecto del seed inicial ya existía al comenzar la fase 1 y se conservó.

### Preparación y credenciales

- [scripts/demo-local.mjs](scripts/demo-local.mjs): carga repetible e idempotente con hash real de contraseñas y relaciones académicas.
- [scripts/demo-content.mjs](scripts/demo-content.mjs): contenido original de las cinco materias.
- La preparación exige la base local aislada `esapiens_demo_local`, puerto `55433`, y el proyecto Docker `esapiens_demo_local`.
- Las credenciales completas están en `CREDENCIALES_DEMO_LOCAL.txt`. El archivo existe y se comprobó que Git lo ignora.
- Este Markdown no contiene contraseñas, hashes, cookies, tokens ni secretos de infraestructura.
- Las cuentas son ficticias, usan el dominio `esapiens.test` y deben reemplazarse o desactivarse después de la demostración.

## 5. Estado operativo comprobado el 23/11/2026

| Componente                                           | Resultado actual                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Docker                                               | Motor Linux disponible                                                   |
| Frontend: `http://localhost:3000/login`              | HTTP 200                                                                 |
| Gateway: `http://localhost:4100/api/v1/health/ready` | HTTP 200; contenido, analítica, identidad, académico y Redis disponibles |
| PostgreSQL y Redis de demostración                   | Contenedores saludables; consultas reales y autenticación verificadas    |
| Archivos compilados API / web                        | Presentes: `apps/api/dist/main.js` y `apps/web/.next/BUILD_ID`           |
| Node.js predeterminado del sistema                   | `26.12.1`, fuera del rango admitido por el proyecto                      |
| Node.js local para la demo                           | `24.21.0`, disponible; lo selecciona `scripts/dev-demo.ps1`              |
| pnpm                                                 | `10.34.5`, coincide con `packageManager`                                 |

La fase 2 recompiló y reinició el supervisor de la aplicación, conservando PostgreSQL, Redis, volumen, cuentas y materias. Pasaron tipos, build, lint sin errores, 20 pruebas unitarias LMS, 10 pruebas PostgreSQL con rollback, 36 comprobaciones SSR/lógica cliente, 193 comprobaciones HTTP y 14 pares de contraste. Véase el informe de fase para sus límites y evidencias; los resultados históricos siguientes se conservan como referencia.

## 6. Validaciones históricas

Resultados registrados durante la implementación del **20/11/2026**:

| Verificación                                                         | Resultado registrado                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Instalación inicial con lockfile congelado                           | Completada                                                                             |
| Comprobación de tipos                                                | Aprobada                                                                               |
| Build completo de API y web                                          | Aprobado                                                                               |
| Pruebas unitarias seleccionadas                                      | 52 aprobadas                                                                           |
| E2E del Centro de Datos, incluidas consultas PostgreSQL con rollback | 43 aprobadas                                                                           |
| Comprobaciones funcionales y de integración consolidadas             | 132 aprobadas, 0 fallidas                                                              |
| Login de las 20 cuentas                                              | Aprobado                                                                               |
| Portales y seis vistas del Centro de Datos                           | Respuestas HTTP verificadas con sesión autorizada                                      |
| Exportaciones Excel                                                  | Descargadas y reabiertas programáticamente                                             |
| Autorización                                                         | Accesos anónimos, estudiantes y materias ajenas rechazados                             |
| Flujo académico real                                                 | Entrega, calificación persistida y evaluación resuelta mediante las rutas del frontend |
| Idempotencia del seed                                                | Segunda ejecución sin duplicar cuentas ni materias                                     |
| Lint                                                                 | Sin errores; dos advertencias en backend                                               |

Las evidencias locales están en `.tmp/verification-final.json`, `.tmp/final-check.json`, `.tmp/dashboard-stats.json` y `.tmp/demo-courses.json`. `.tmp` está excluido de Git; estos archivos no acompañarán un clon nuevo.

**No se realizó validación visual automatizada ni de interacciones en navegador**, porque no había navegador conectado. Las comprobaciones de páginas se hicieron por HTTP.

## 7. Direcciones configuradas

La comprobación final de estas direcciones está registrada en el informe de la fase 4, con sesión autorizada cuando correspondía. El gateway mantiene el puerto `4100`; no se modificaron procesos de otros proyectos ni se intentó ocupar el puerto `4000`.

| Página o servicio                | Dirección                                                           |
| -------------------------------- | ------------------------------------------------------------------- |
| Frontend                         | http://localhost:3000                                               |
| Login                            | http://localhost:3000/login                                         |
| Catálogo                         | http://localhost:3000/cursos                                        |
| Biblioteca                       | http://localhost:3000/biblioteca                                    |
| Portal administrador             | http://localhost:3000/portal/administrador                          |
| Portal docente                   | http://localhost:3000/portal/docente                                |
| Portal estudiante                | http://localhost:3000/portal/estudiante                             |
| Agenda administrativa            | http://localhost:3000/portal/administrador/agenda                   |
| Agenda docente                   | http://localhost:3000/portal/docente/agenda                         |
| Agenda estudiante                | http://localhost:3000/portal/estudiante/agenda                      |
| Gestión de docentes              | http://localhost:3000/portal/administrador/docentes                 |
| Gestión de estudiantes           | http://localhost:3000/portal/administrador/usuarios?kind=estudiante |
| Centro de Datos                  | http://localhost:3000/portal/administrador/datos                    |
| Reportes                         | http://localhost:3000/portal/administrador/datos?view=reports       |
| Swagger principal                | http://localhost:4100/api/docs                                      |
| Salud del gateway y dependencias | http://localhost:4100/api/v1/health/ready                           |
| Swagger contenido                | http://127.0.0.1:4001/api/docs                                      |
| Swagger analítica                | http://127.0.0.1:4002/api/docs                                      |
| Swagger identidad                | http://127.0.0.1:4003/api/docs                                      |
| Swagger académico                | http://127.0.0.1:4004/api/docs                                      |
| PostgreSQL de demostración       | `127.0.0.1:55433`, base `esapiens_demo_local`                       |
| Redis de demostración            | `127.0.0.1:56379`                                                   |

Las vistas del Centro de Datos usan `?view=overview`, `students`, `courses`, `teachers`, `traffic` y `reports`. Los endpoints internos mantienen su autenticación de servicio; publicar Swagger no elimina ese requisito.

## 8. Arranque local

1. Abrir Docker Desktop y esperar a que el motor Linux esté disponible.
2. Desde una terminal PowerShell en la raíz del proyecto, ejecutar:

   ```powershell
   .\scripts\dev-demo.ps1
   ```

   El script selecciona Node 24 local y ejecuta `pnpm.cmd demo:start`. El preparador levanta PostgreSQL y Redis, aplica migraciones pendientes y arranca el frontend compilado y los cinco procesos del backend. Mantener abierta la terminal; `Ctrl+C` detiene los procesos supervisados de la aplicación.

3. Comprobar el login y `/api/v1/health/ready` antes de realizar la presentación.

Con Node 24 seleccionado, los comandos adicionales disponibles son:

```powershell
pnpm.cmd setup:demo  # Preparar infraestructura, esquema y datos ficticios
pnpm.cmd demo:seed   # Volver a ejecutar la carga idempotente
pnpm.cmd build       # Recompilar si se modifica el código
pnpm.cmd dev         # Desarrollo con vigilancia del código fuente
```

El modo `demo:start` usa los archivos compilados para evitar los bloqueos y reinicios observados en el modo de desarrollo durante la preparación anterior. Si cambia el código, se debe completar el build antes de usar ese modo.

## 9. Pendientes

- Realizar revisión visual e interactiva en navegador, incluidos tamaños móviles.
- No se ha validado carga concurrente ni rendimiento en producción.
- La publicación del PR está pendiente: sigue abierto el PR #15 con funciones incorporadas en esta propuesta y la integración Vercel puede crear un preview al publicar. Se respeta la instrucción de no desplegar en Vercel. Título y cuerpo revisables: [PULL_REQUEST_FASES_1_4.md](PULL_REQUEST_FASES_1_4.md).

La validación histórica de la sección 6 se conserva. La fase 4 ejecutó las 110 pruebas unitarias API y las 78 E2E completas; los conteos de las 84 tablas permanecieron intactos. También incorpora pruebas mantenidas de FAQ con `node:test`, verificaciones controladas de interfaz y regresión HTTP de los cuatro bloques. Las cifras finales y el estado de servicios están en su informe.

Se mantienen las optimizaciones de la fase 1, la navegación de la fase 2 y la agenda de la fase 3. Continúa pendiente la revisión visual e interactiva por falta de navegador conectado. El trabajo de las cuatro fases queda en la misma rama local, sin publicación, merge ni certificación de producción.
