# E-SAPIENS — Fase 1: estabilización y rendimiento

Fecha: 23/11/2026 (America/La_Paz).
Rama: `feat/ux-performance-calendar-assistant`.
Base: `d0cb345`, también verificada en `origin/main` mediante fetch sin pull.

## Trabajo protegido y alcance

Se conservó el trabajo local previo. Antes de editar se guardaron el diff de archivos versionados y copias de los archivos nuevos en `.tmp/phase1/`, fuera de Git. La consolidación y las optimizaciones se incluyen en un commit local de esta rama; consultar `git log -1` para su identificador. No se hizo push ni merge, ni se avanzó a la fase 2.

Se revisó el PR #15: sigue abierto, base `d0cb345`, cabeza `55e82152`. Ya estaban presentes sus seis vistas del Centro de Datos y las mejoras académicas. Se conservaron, junto con las exportaciones Excel, los portales y el seed idempotente. No se duplicaron módulos.

## Entorno recuperado

- Docker Desktop está disponible; PostgreSQL y Redis de demostración están saludables. Se reutilizaron el proyecto `esapiens_demo_local`, su volumen y sus datos.
- Se utilizó Node 24.21.0 local y pnpm 10.34.5. El Node 26 del PATH general continúa fuera del rango del proyecto; `scripts/dev-demo.ps1` selecciona Node 24.
- Frontend: http://localhost:3000. Login: http://localhost:3000/login.
- Gateway y Swagger: http://localhost:4100/api/docs. Salud: http://localhost:4100/api/v1/health/ready.
- Servicios de contenido, analítica, identidad y académico: puertos 4001, 4002, 4003 y 4004; sus Swagger respondieron correctamente.
- PostgreSQL: `127.0.0.1:55433/esapiens_demo_local`. Redis: `127.0.0.1:56379`.
- Los procesos siguen activos en el supervisor compilado usado para verificar la fase. Arranque desde PowerShell: `.\scripts\dev-demo.ps1`.

No se reinstalaron dependencias, no se regeneraron datos de demostración y no se eliminaron archivos, bases ni volúmenes. Las contraseñas permanecen en el archivo local ignorado; no están en este informe.

La base ya contenía 20 cuentas y 40 matrículas, 37 activas, antes de optimizar. Estos valores se conservaron; no se restablecieron los 39 registros del seed inicial.

## Cambios aplicados

1. **Frontend docente:** curso y sección seleccionada se solicitan en paralelo. Se conserva la prioridad del 403/404 del curso, los validadores y `cache: no-store`.
2. **Curso docente:** metadatos y módulos se obtienen en una consulta, manteniendo el alcance de usuario y la disponibilidad de módulos del estudiante.
3. **Evaluaciones:** una agregación de intentos sustituye cuatro subconsultas por evaluación. Se conservan vencimientos, último intento, conteos, notas y ámbito de matrícula.
4. **Progreso:** últimas entregas y asistencias se agrupan por matrícula en lugar de agregarse de forma lateral por cada fila. Las notas antiguas no sustituyen una entrega posterior sin calificar.
5. **Centro de Datos:** configuración y opciones de materias se incluyen en la consulta existente; pasan de cuatro a dos consultas totales. Exportar CSV omite resumen y comparaciones que no utiliza.
6. **Integración:** la prueba LMS existente admite también la base demo en el puerto 55433, conservando la restricción de host local y el rollback.

La identidad ya empleaba una consulta por autenticación y la sesión de los Server Components ya estaba deduplicada por solicitud. El calendario ya se cargaba bajo demanda. No se añadieron cachés de datos privados, bibliotecas, endpoints ni servicios nuevos en esta fase.

## Método de medición

Se usó la misma base ficticia, los mismos roles, filtros y rutas y el modo compilado antes y después. Cada serie tiene dos solicitudes de calentamiento y nueve muestras secuenciales. Los tiempos HTTP incluyen la lectura completa de la respuesta, con codificación identity. El tamaño informado es el cuerpo HTML/JSON sin compresión; no es el tamaño de JavaScript descargado por un navegador.

Las mediciones de servicios SQL usan una conexión de solo lectura y concluyen con rollback. Se capturó `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` de las consultas reales. Los tiempos SQL del servicio incluyen el viaje a PostgreSQL; la columna EXPLAIN suma el tiempo de ejecución de un plan por consulta y no representa una mediana. No se introdujeron índices ni migraciones: los planes y el volumen pequeño de la demo no los justificaban.

La primera serie posterior coincidió con lint; se conservó en `.tmp/phase1/after-with-lint.json` y se repitió una vez sin esa carga. Las tablas muestran la segunda serie posterior. Son observaciones locales con muestra pequeña, sensibles a carga del equipo y JIT; no prueban rendimiento con concurrencia ni en producción.

### HTTP

| Ruta representativa | Mediana antes (ms) | Mediana después (ms) | P95 antes → después (ms) | Bytes antes → después |
|---|---:|---:|---:|---:|
| Portal administrador | 42.25 | 36.65 | 49.23 → 40.89 | 84341 → 84341 |
| Centro de Datos (página) | 64.29 | 68.99 | 129.76 → 88.84 | 148020 → 148020 |
| Materiales del docente | 45.20 | 30.92 | 59.63 → 33.75 | 48331 → 48331 |
| Tareas del docente | 51.28 | 31.01 | 71.73 → 59.17 | 42248 → 42248 |
| API panel administrativo | 24.14 | 23.86 | 25.30 → 34.26 | 1460 → 1460 |
| API Centro de Datos | 46.47 | 34.82 | 57.47 → 44.29 | 12103 → 12103 |
| API evaluaciones estudiante | 13.75 | 11.78 | 17.41 → 14.40 | 288 → 288 |

Materiales y tareas docentes reducen su mediana en estas muestras. **La mediana HTML del Centro de Datos no mejoró**: pasó de 64,29 a 68,99 ms, aunque su P95 y el endpoint de datos bajaron. No se atribuye una mejora general de esa página. El panel y el listado de materias son controles sin optimización específica.

### Consultas PostgreSQL

| Operación | Consultas antes → después | Mediana servicio antes → después (ms) | Ejecución EXPLAIN antes → después (ms) | Bloques compartidos hit antes → después |
|---|---:|---:|---:|---:|
| Listado de materias (control) | 1 → 1 | 2.95 → 2.97 | 0.432 → 0.487 | 47 → 49 |
| Progreso académico | 1 → 1 | 20.79 → 7.88 | 2.785 → 2.557 | 387 → 407 |
| Curso y módulos | 2 → 1 | 14.71 → 1.86 | 0.136 → 0.087 | 6 → 6 |
| Centro de Datos | 4 → 2 | 45.14 → 27.42 | 18.905 → 7.492 | 518 → 344 |
| CSV del Centro de Datos | 1 → 1 | 24.54 → 13.33 | 6.705 → 3.536 | 485 → 109 |
| Evaluaciones estudiante | 3 → 2 | 8.38 → 7.35 | 1.984 → 1.211 | 196 → 187 |
| Evaluaciones docente | 3 → 2 | 6.60 → 4.48 | 0.399 → 0.322 | 48 → 40 |

Las siete respuestas académicas normalizadas coincidieron antes y después, excluyendo únicamente `generatedAt`. No se alteraron datos académicos para las mediciones; la autenticación creó sesiones mediante el flujo habitual. Las lecturas de bloques compartidos desde disco fueron cero en ambas series; eran mediciones con datos calientes. Progreso no reduce los bloques hit en esta muestra, por lo que no se afirma una reducción de I/O de esa consulta.

### Cantidad de solicitudes

Las trazas de una respuesta completa conservaron estos valores antes y después:

| Página | Peticiones al gateway | Llamadas internas adicionales | GET identity/me desde Next.js |
|---|---:|---:|---:|
| Portal administrador | 2 | 2 | 1 |
| Centro de Datos | 2 | 3 | 1 |
| Materiales docente | 3 | 3 | 1 |
| Tareas docente | 3 | 3 | 1 |

El frontend mejora la concurrencia de sus lecturas; no se afirma que disminuya su cantidad. Los servicios siguen autenticando cada operación. Las llamadas internas no son peticiones adicionales del navegador. El tamaño de las respuestas también se mantuvo.

## Validación

- Comprobación de tipos de API y web: aprobada; build completo: aprobado.
- 52 pruebas unitarias seleccionadas aprobadas; 45 E2E únicas aprobadas entre autorización HTTP del Centro de Datos, PostgreSQL y flujo LMS.
- Regresión añadida con clases anteriores/posteriores a la matrícula, asistencia manual verificada y no verificada y última entrega sin nota: aprobada mediante savepoint y rollback.
- 116 comprobaciones funcionales aprobadas: 20 logins, páginas por rol, seis vistas del Centro de Datos, materias, progreso, XLSX reabiertos, filtros y restricciones 401/403/404.
- Lint de API y del componente web modificado: sin errores. Permanecen dos advertencias previas en el exportador Excel: control-regex intencional y conversión genérica de valores.
- No se cambiaron permisos, sesiones, auditoría, funciones de acceso ni migraciones existentes.
- No había navegador automatizado disponible. No se verificaron consola de hidratación, navegación interactiva ni comportamiento visual en tamaños móviles; se comprobaron las rutas por HTTP y se revisó el código de Gestión/Aula sin encontrar un cambio necesario.

Los resultados sin resumir, planes, equivalencia y registros de ejecución permanecen en `.tmp/phase1/` y no se incorporan a Git.

## Archivos propios de la optimización

- `apps/web/src/features/teaching/workspace.tsx`.
- `apps/api/src/modules/academic/teaching.service.ts`.
- `apps/api/src/modules/academic/evaluation.service.ts`.
- `apps/api/src/modules/academic/progress.queries.ts`.
- `apps/api/src/modules/analytics/data-center.service.ts`.
- `apps/api/test/data-center.postgres.e2e-spec.ts`.
- `apps/api/test/lms-workflows.e2e-spec.ts`.
- `ESTADO_ACTUAL_PROYECTO.md` y este informe.

El commit también consolida los archivos de la implementación local anterior que seguían sin versionarse. Los archivos ignorados, las credenciales y la configuración privada permanecen fuera del commit.

## Límites y cierre

Falta la comprobación interactiva en navegador y no se ha probado carga concurrente. La mediana de la página del Centro de Datos no mostró mejora en esta serie. No se añaden optimizaciones sin evidencia para corregir variaciones pequeñas de una muestra local. La fase termina en esta rama, sin trabajo de fase 2.
