# Base de datos

## Esquema existente

`migrations/0001_initial_schema.sql` conserva el esquema recibido sin datos ficticios. Incluye su propia transacción y no se ha editado. Un cambio posterior del esquema debe introducir una nueva migración.

`pnpm db:init` instala esa migración exclusivamente en una base local sin esquema `lms`. Toma un bloqueo asesor para serializar inicializadores y rechaza la operación si el esquema ya existe. No borra, reinicia ni intenta reconstruir una base existente.

`pnpm db:check` consulta el número de tablas, funciones, cursos publicados y fichas públicas. Es una comprobación de conectividad y presencia, **no** una comparación completa de deriva del esquema.

`pnpm db:migrate` aplica las migraciones incrementales desde 0002, en una transacción con bloqueo asesor. Registra nombre y SHA-256 (normalizando saltos de línea) en `lms.schema_migrations`; rechaza cambios en migraciones aplicadas. Exige que exista `lms.usuarios`, pero no marca 0001 como aplicada ni certifica que una base importada coincida completamente con ella. La 0002 añade roles y permisos de identidad sin borrar registros. Repetir el comando no vuelve a ejecutar migraciones registradas. Antes de aplicarlo fuera de local: comprobar destino, backup y compatibilidad del esquema. Crear una migración correctiva para cambios posteriores; no revertir borrando datos.

La migración 0003 añade permisos académicos y las columnas de actor/motivo y trigger
de auditoría en `curso_docentes`. Matrículas y asignaciones se gestionan desde el
[portal privado](../docs/15-private-portal.md); no se modifican migraciones aplicadas.

## Demo local

La migración incremental 0004 incorpora solicitudes de inscripción, permisos de
aula/acceso y auditoría de autorizaciones y revocaciones. Está preparada para
ejecutarla con `pnpm.cmd db:migrate`; no se aplicó durante la entrega del 05/10.

Después de disponer del catálogo ficticio, `pnpm.cmd db:seed:classroom` prepara
texto de las cinco lecciones demo y reglas de avance por lectura solo cuando no
existían. Usa los mismos límites de entorno local/test y transacción del seed
original. No reemplaza textos no vacíos ni reglas existentes, no crea usuarios,
matrículas ni concesiones. [Guía del recorrido](../docs/16-enrollment-classroom.md).

```powershell
pnpm.cmd db:seed:demo
```

`seeds/demo.sql` añade tres cursos, módulos y títulos de lecciones, dos fichas bibliográficas, un autor y temas. Todos los cursos y fichas están identificados como demostración; las descripciones y referencias son ficticias. No hay archivos privados ni grabaciones de prueba que puedan confundirse con contenido real.

La ejecución es transaccional, usa un bloqueo asesor y UUIDs estables. `ON CONFLICT (id) DO NOTHING` permite repetirla sin duplicar registros ni sobrescribir ediciones. Una colisión de otra restricción provoca rollback y requiere revisar el conflicto.

El usuario técnico del seed está suspendido, no tiene roles y su campo de contraseña contiene material aleatorio que no es un hash de autenticación válido. No proporciona una cuenta de acceso. Los antiguos CSV de contraseñas del material de referencia siguen excluidos.

Las operaciones de inicialización y seed exigen `APP_ENV=local|test`, `NODE_ENV` distinto de `production`, host loopback y base `esapiens|esapiens_test`. Son defensas contra errores operativos; no sustituyen usuarios y permisos de base separados por entorno. No ejecutar manualmente el SQL para eludir esas comprobaciones.

## Pruebas y conservación de datos

`apps/api/test/public-catalog.e2e-spec.ts` crea fixtures aleatorias en una única conexión y transacción, utilizada por la API durante las pruebas. Al cerrar ejecuta `ROLLBACK`. No usa `TRUNCATE`, borrados masivos ni el seed demo. CI crea el esquema en el servicio PostgreSQL efímero antes de ejecutar las pruebas.

La verificación local de inicialización se realizó en una base separada `esapiens_test`, conservando `esapiens`. No es necesario repetir `db:init` para arrancar cada día.

`reference/` contiene consultas y pruebas originales de diseño. No se ejecuta automáticamente contra la base de trabajo. Antes de producción se necesitan un usuario de aplicación sin privilegios administrativos, backup y una restauración comprobada.
