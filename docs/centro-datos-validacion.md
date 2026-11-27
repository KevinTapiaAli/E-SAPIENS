# Centro de Datos: entrega y validación

Validación local del 12 de noviembre de 2026, zona `America/La_Paz`. Rama `feat/admin-data-center`, basada en `origin/develop`.

## Alcance entregado

La ruta `/portal/administrador/datos` incorpora resumen, estudiantes, cursos, docentes, actividad web y reportes. Incluye filtros reales, paginación y ordenamiento en PostgreSQL, gráficos con alternativas textuales, expedientes y enlaces administrativos, recomendaciones determinísticas y CSV autorizado. Se conservan el Panel ejecutivo y el Análisis académico. El README documenta métricas, filtros, límites, autorización, endpoints y el texto para el informe académico.

La API principal autoriza las consultas y delega al servicio interno de analítica existente. Se reutilizan la consulta de progreso, la actividad académica y el tráfico del sistema. No se añadieron dependencias, servicios, tablas ni migraciones. Los informes realizan únicamente lecturas.

## Comprobaciones ejecutadas

| Comando                 | Resultado                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm.cmd format:check` | Correcto.                                                                                |
| `pnpm.cmd lint`         | Correcto; sin errores ni advertencias de lint.                                           |
| `pnpm.cmd typecheck`    | Correcto en web y API.                                                                   |
| `pnpm.cmd test`         | 8 suites y 33 pruebas aprobadas.                                                         |
| `pnpm.cmd test:e2e`     | 5 suites y 74 pruebas aprobadas.                                                         |
| `pnpm.cmd build`        | Compilación de producción de web y API correcta; incluye la nueva página y el proxy CSV. |

Se utilizó Node.js 24.21.0, pnpm 10.34.5, PostgreSQL local y Redis local. Turborepo reutilizó resultados válidos al confirmar nuevamente lint y compilación sin cambios en sus entradas.

Las pruebas nuevas cubren permisos administrativos y compatibilidad con administrador general, rechazo de estudiantes y docentes incluso con permisos nominales, filtros válidos e inválidos, parámetros repetidos, curso, período y estados, ordenamiento y paginación, páginas vacías con total conservado, promedios y porcentajes, cobertura vigente/vencida/futura/revocada, múltiples autorizaciones, últimos intentos de entrega, protección de datos privados, CSV y fallos del servicio.

Las fixtures de integración utilizan UUID exclusivos dentro de una transacción y se revierten mediante `ROLLBACK`. No se borró ni reinicializó la base y no se modificaron registros preexistentes. La preparación de la prueba de disponibilidad espera la conexión efectiva de Redis: evita la carrera inicial sin simular la infraestructura ni debilitar la comprobación de disponibilidad.

Además, se ejecutaron comprobaciones HTTP con procesos locales y una cuenta administrativa temporal dentro de una transacción reversible:

- Las seis vistas respondieron `200` con contenido renderizado desde la web de producción y la cadena web → API principal → servicio de analítica.
- El proxy CSV respondió `200`, descargó los registros y conservó `Cache-Control: private, no-store`.
- Los filtros inválidos mostraron el estado de error correspondiente.
- Al detener el servicio de analítica, la API devolvió `503` controlado.
- Los endpoints nuevos aparecieron en Swagger de la API principal; las pruebas también verifican la documentación del servicio interno y la composición de proveedores.

## Límites y verificación pendiente

No hubo un navegador conectado disponible: no se realizó inspección visual en dispositivos ni se generaron capturas. El renderizado HTTP y la compilación fueron comprobados; la revisión visual de tamaños de pantalla y temas queda pendiente.

La exportación tiene un máximo de 5000 filas e informa truncamiento. El selector presenta hasta 500 materias, las comparaciones agregadas hasta 10 y los cursos más consultados hasta 6. Los estados académicos son fotografías actuales; no se reconstruyen estados anteriores. Las visitas previas a habilitar la medición aparecen sin datos. Estas limitaciones también están indicadas en la interfaz y el README.

## Archivos creados

| Archivo                                                      | Finalidad                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `apps/api/src/modules/academic/progress.queries.ts`          | Consulta de progreso extraída para reutilizar su definición existente. |
| `apps/api/src/modules/analytics/data-center.controller.ts`   | Endpoints públicos, autorización y descarga CSV.                       |
| `apps/api/src/modules/analytics/data-center.dto.ts`          | Validación de filtros, límites y orden.                                |
| `apps/api/src/modules/analytics/data-center.openapi.ts`      | Esquema documentado de respuestas.                                     |
| `apps/api/src/modules/analytics/data-center.queries.ts`      | Consultas parametrizadas y proyecciones autorizadas.                   |
| `apps/api/src/modules/analytics/data-center.service.ts`      | Composición de resultados, reglas y exportación segura.                |
| `apps/api/src/modules/analytics/data-center.spec.ts`         | Pruebas unitarias de cálculos, recomendaciones y CSV.                  |
| `apps/api/src/services/data-center.controller.ts`            | Rutas internas protegidas por el guard existente.                      |
| `apps/api/test/data-center.e2e-spec.ts`                      | Pruebas HTTP de autorización, validación y errores.                    |
| `apps/api/test/data-center.postgres.e2e-spec.ts`             | Pruebas con consultas reales y transacción reversible.                 |
| `apps/web/src/app/api/analytics/data-center/export/route.ts` | Proxy privado para descargar CSV.                                      |
| `apps/web/src/app/portal/[role]/datos/page.tsx`              | Ruta del portal y comprobación de acceso.                              |
| `apps/web/src/features/analytics/data-center-charts.tsx`     | Barras, dona y evolución temporal accesibles.                          |
| `apps/web/src/features/analytics/data-center-export.tsx`     | Descarga, errores y aviso de truncamiento.                             |
| `apps/web/src/features/analytics/data-center-validation.ts`  | Comprobación del contrato recibido en servidor.                        |
| `apps/web/src/features/analytics/data-center.tsx`            | Vistas, filtros, indicadores, tablas y recomendaciones.                |
| `docs/centro-datos-validacion.md`                            | Este informe de entrega, pruebas y archivos.                           |

## Archivos modificados

| Archivo                                                   | Cambio                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `README.md`                                               | Funciones, métricas, autorización, consultas, límites y comprobaciones. |
| `apps/api/src/infrastructure/services/gateway.module.ts`  | Registro del controlador y proveedor remoto.                            |
| `apps/api/src/infrastructure/services/remote-services.ts` | Comunicación con las consultas y exportaciones internas.                |
| `apps/api/src/modules/academic/progress.service.ts`       | Importación de la consulta común, manteniendo su lógica.                |
| `apps/api/src/modules/analytics/analytics.module.ts`      | Registro del módulo en la composición de dominio existente.             |
| `apps/api/src/modules/analytics/analytics.service.ts`     | Parámetro opcional de curso en la consulta compartida de tráfico.       |
| `apps/api/src/modules/analytics/dashboard.queries.ts`     | Actividad reutilizable y ámbito opcional de curso para tráfico.         |
| `apps/api/src/services/analytics.module.ts`               | Registro de consultas en el servicio de analítica existente.            |
| `apps/api/src/services/composition.spec.ts`               | Verificación de proveedores locales e internos.                         |
| `apps/api/src/services/swagger.spec.ts`                   | Verificación de endpoints internos documentados.                        |
| `apps/api/test/app.e2e-spec.ts`                           | Espera acotada de disponibilidad real de Redis al preparar la suite.    |
| `apps/web/src/features/portal/navigation.ts`              | Entrada Centro de Datos según permisos.                                 |
| `packages/contracts/index.d.ts`                           | Tipos compartidos de resultados y exportaciones.                        |
