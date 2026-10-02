# Roadmap de ejecución

Actualizado el 01/10/2026 para un único desarrollador, sin presupuesto económico asignado y con infraestructura y concurrencia pendientes de confirmar. Estas etapas sustituyen las fechas orientativas del blueprint; no son compromisos de lanzamiento.

## Entrega 1 — Demostración web del 05/10/2026

- Arranque local reproducible de web, API, PostgreSQL y Redis.
- Catálogo real: búsqueda, paginación, ficha de curso y temario público.
- Biblioteca real: fichas públicas, autoría, referencia y temas.
- Contratos compartidos, Swagger, validación y pruebas de visibilidad con PostgreSQL.
- Datos ficticios identificados y guion para presentar negocio y arquitectura.

El login, la aprobación de cuentas y el aula no forman parte de esta primera demo. La interfaz lo comunica explícitamente. No se contrata hosting para esta entrega.

## Entrega 2 — Identidad y aprobación

Siguiente módulo de desarrollo después de cerrar las verificaciones de la entrega 1:

1. Registrar una cuenta pendiente, sin confiar en roles enviados por el navegador.
2. Autenticar con hash seguro y sesiones revocables; limitar intentos.
3. Aprobar/rechazar cuentas con permisos y auditoría.
4. Proteger rutas y mostrar el estado de aprobación al usuario.
5. Probar usuarios pendientes, suspendidos, sesiones revocadas y acceso cruzado.

Definir primero quién administra la primera cuenta, cómo se recupera el acceso sin proveedor de correo confirmado y qué datos personales son indispensables. No crear credenciales públicas de administrador.

## Entrega 3 — Aula y operación del contenido

Administración mínima de cursos/biblioteca, asignación de docentes, matrículas, acceso temporal, navegación de lecciones y progreso persistido. Cada acción se autoriza en NestJS. Incorporar archivos privados solo con almacenamiento y permisos definidos.

## Entrega 4 — Flujos de la guía de reunión

Evaluaciones, tareas, clases con enlaces Meet/Zoom y asistencia, grabaciones con vencimiento, pagos QR verificables e idempotentes, certificados, comunicación y reportes. Priorizar por necesidad confirmada con Pablo Rivero; no simular cobros exitosos para sustituir una integración real.

Cerrar antes las políticas de aprobación de examen, pago y renovación, vencimientos y certificación. Las recomendaciones pueden comenzar por reglas si el cliente lo acepta; una red neuronal requiere objetivo y datos evaluables.

## Despliegue empresarial

Depende de inventario real de equipos, conexión, disponibilidad, responsable operativo, almacenamiento y concurrencia objetivo. Medir carga, revisar seguridad, probar backup/restore, documentar operación y obtener aceptación funcional antes de publicar para estudiantes reales.

La app móvil se mantiene fuera del alcance hasta finalizar el proyecto web. El diseño adaptable del sitio sí forma parte de la web.
