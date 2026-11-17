# Estabilización final: implementación y validación

Revisión del 16 de noviembre de 2026, zona `America/La_Paz`. Rama `feat/final-stabilization-ux`, creada desde `origin/main` (`d0cb345`). Esta revisión no se ha desplegado en producción.

## Integración y funciones

- Se conservan los PR #10, #12 y #14. `main` tenía doce commits exclusivos frente a `develop`, y `develop` uno; no se fusionó la rama antigua.
- Se reutiliza el commit `90309f8` del PR #11, adaptando gateway, navegación y pruebas de composición. El módulo monolítico eliminado no se restaura: identidad continúa remota y el gateway no abre conexiones SQL.
- El PR #13 ya es ancestro de `origin/main`; se conserva su configuración vigente sin aplicar otro parche. Los PR #11 y #13 quedan abiertos para revisión posterior.
- `/portal/administrador/datos`: seis vistas, consultas reales, filtros, paginación, gráficos con alternativas textuales, CSV limitado y protegido contra fórmulas, y recomendaciones determinísticas.
- El gateway exige sesión aprobada, rol administrativo y permisos `dashboard.admin` y `academic.read` antes de delegar a analítica. La clave interna permanece en el servidor.
- El panel ejecutivo conserva indicadores y prioridades, añade accesos a datos y pagos y deja los gráficos de evolución y comparación al Centro de Datos.
- Usuarios y docentes combinan búsqueda y estado de cuenta; usuarios añade perfil. La paginación conserva los filtros y los controles de permisos existentes.
- El Aula virtual muestra avance y distingue matrículas de solicitudes pendientes. El registro administrativo enlaza la gestión de temarios; se añade acceso directo estudiantil a evaluaciones y resultados.
- Las evaluaciones muestran intentos restantes, estado, vencimiento y entrega en la zona horaria de la cuenta. No cambian calificación, duración, límite de intentos ni acceso a respuestas correctas.
- Se mantienen tareas, entregas, calificaciones, seguimiento, historial, vigencias y pagos manuales existentes. La prueba LMS comprueba repetición de orden, referencia y revisión sin duplicar pagos ni autorizaciones.

## Archivos principales

Gateway y clientes remotos en `apps/api/src/infrastructure/services/`; Centro de Datos en `apps/api/src/modules/analytics/` y `apps/api/src/services/analytics.module.ts`; consultas de evaluaciones en `apps/api/src/modules/academic/evaluation.service.ts`; contratos en `packages/contracts/index.d.ts`; pantallas y componentes de datos, gestión, aula y evaluaciones en `apps/web/src/`; README y pruebas de API. No se añaden dependencias, microservicios, tablas ni migraciones.

## Comprobaciones locales

Node 24.15.0 (dentro del rango admitido) y pnpm 10.34.5 con instalación del lockfile sin modificaciones. El equipo tenía Node 26 activo; se seleccionó Node 24 únicamente para los comandos de validación.

| Comprobación                  | Resultado                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formato completo              | Aprobado.                                                                                                                                                                 |
| Lint completo                 | Aprobado, sin errores ni advertencias.                                                                                                                                    |
| Tipos completos               | Aprobado.                                                                                                                                                                 |
| Pruebas unitarias             | 12 suites y 80 pruebas aprobadas.                                                                                                                                         |
| Build completo                | Next.js y API aprobados; rutas privadas dinámicas.                                                                                                                        |
| E2E completas                 | 4 suites aprobadas y 2 fallidas; 60 pruebas aprobadas y 15 fallidas por Redis local ausente.                                                                              |
| PostgreSQL                    | Instancia temporal de PostgreSQL 17 en loopback y puerto 55433; esquema vacío y migraciones 0002–0010 aplicados. Instancia detenida al terminar.                          |
| Consultas del Centro de Datos | Suite PostgreSQL aprobada: agregados, cobertura, filtros, orden, paginación, datos ausentes y CSV. Fixtures revertidas con `ROLLBACK`.                                    |
| Autorización HTTP             | Suite del Centro de Datos aprobada: `200`, `401`, `403`, filtros inválidos y `503` controlado.                                                                            |
| Flujo LMS                     | Aprobado: compra, referencia pendiente, revisión, acceso, examen y nota; propiedad, idempotencia y vencimientos.                                                          |
| `deploy:check`                | Ejecutado; falla por configuración local ausente: `APP_URL`, `API_URL`, `DATABASE_URL`, `REDIS_URL`, `INTERNAL_SERVICE_TOKEN`. Advierte que falta `PAYMENT_INSTRUCTIONS`. |

Las cinco entradas CommonJS de Vercel se cargaron con Node 24 y exportan un manejador HTTP válido, sin iniciar listeners. Las pruebas de composición verifican los cinco módulos y la ausencia de SQL en el gateway.

Las suites fallidas son identidad (login devuelve `503` al no poder aplicar límites en Redis) y disponibilidad (Redis ausente). No se omitieron esos fallos ni se sustituyó Redis por una confirmación ficticia. Repetir la suite completa con Redis y PostgreSQL 18 en CI antes de integrar. No se usaron bases existentes ni conexiones de producción para las pruebas.

## Producción: comprobación HTTP de solo lectura

Sobre `https://e-sapiens-web.vercel.app/`, sin modificar configuración, cuentas o datos:

- `200`: `/`, `/cursos`, `/biblioteca`, `/login`, `/registro`, `/api/v1/courses`, `/api/v1/library`, `/api/v1/health` y `/api/v1/health/ready`.
- Disponibilidad informa contenido, analítica, identidad, académico y Redis activos; los servicios internos comprueban PostgreSQL. No es una medición de carga ni una conexión directa a la base.
- `401`: `/api/v1/identity/me` y materias académicas sin sesión.
- `307` a `/login`: portal administrativo anónimo.
- `404`: ruta API inexistente y Centro de Datos, aún no publicado.

## Límites pendientes

No hay navegador conectado: faltan capturas y revisión visual a 360, 768 y 1440 px, teclado e interacción de los tres perfiles. No hay credenciales de prueba de producción: no se ejecutaron registro, login válido ni operaciones académicas o bancarias reales. La compilación no acredita esos recorridos. Falta repetir E2E con Redis y validar el preview del PR. El despliegue, promoción y merge no forman parte de la entrega realizada.

CSV: máximo 5000 filas; selector: 500 materias; comparación: hasta diez materias. Los indicadores son descriptivos y no reconstruyen estados académicos históricos. La actividad de lecciones, tareas y asistencia mantiene su definición; las notas de evaluaciones se consultan por separado.
