# ADR 0004 — Lectura pública de cursos y biblioteca

- Fecha: 01/10/2026.
- Estado: aceptado para la primera entrega web.

## Contexto

Existe un esquema PostgreSQL amplio y una API NestJS con salud operativa. La reunión del 05/10 requiere mostrar un flujo web real para un proyecto con un solo desarrollador y sin presupuesto asignado. La guía distingue fichas/temarios públicos de los materiales que exigen acceso autorizado.

## Decisión

Implementar módulos `catalog` y `library` dentro del monolito NestJS. Usar el pool `pg` existente con SQL parametrizado y selección explícita de campos, sin introducir un ORM para cuatro consultas de lectura. El frontend usa REST y contratos de transporte compartidos mediante un paquete de tipos.

El índice público incluye títulos de módulos y lecciones publicados. La publicación de una lección no hace público su cuerpo: `contenido`, archivos, clases, grabaciones y accesos permanecen excluidos. Las fichas bibliográficas requieren tanto publicación como `ficha_publica`. No es necesario cambiar el esquema ni las migraciones aplicadas.

Next.js renderiza los datos en el servidor con `no-store`. No se añaden cachés que puedan mantener visible contenido retirado. Búsqueda literal y paginación por cursor UUID limitan el tamaño de las listas. Cada detalle evalúa publicación e índice dentro de una consulta.

## Consecuencias

El visitante puede conocer la oferta sin autenticarse y sin acceder a material privado. Los redactores deberán tratar títulos y descripciones publicados como información pública. Si se necesita ocultar el nombre de una lección mientras se ofrece al estudiante inscrito, habrá que modelar visibilidad del temario por separado antes de cargar ese caso de contenido real.

El catálogo se mantiene independiente de una futura matrícula o proveedor de pagos. La siguiente entrega implementará identidad y aprobación, sin duplicar autorización en Next.js. Un cambio de acceso a datos posterior no deberá alterar los contratos externos sin versionarlos.

No se incorpora aplicación móvil, worker ejecutable, almacenamiento de video ni infraestructura de pago en esta entrega. La arquitectura prevista podrá ampliarse con evidencia de necesidad y de capacidad operativa.
