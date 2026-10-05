# Roadmap de ejecución

Actualizado el 04/10/2026 para un único desarrollador, sin presupuesto económico asignado y con infraestructura y concurrencia pendientes de confirmar. Estas etapas sustituyen las fechas orientativas del blueprint; no son compromisos de lanzamiento.

## Entrega 1 — Demostración web del 05/10/2026

- Arranque local reproducible de web, API, PostgreSQL y Redis.
- Catálogo real: búsqueda, paginación, ficha de curso y temario público.
- Biblioteca real: fichas públicas, autoría, referencia y temas.
- Contratos compartidos, Swagger, validación y pruebas de visibilidad con PostgreSQL.
- Datos ficticios identificados y guion para presentar negocio y arquitectura.

La entrega pública inicial no incluía login ni aprobación; se añadieron el 04/10/2026 como entrega 2. El aula sigue pendiente. No se contrata hosting para esta demostración.

## Entrega 2 — Identidad y aprobación

Implementación inicial añadida el 04/10/2026; operación y límites en [identidad y perfiles](14-identity-and-workspaces.md):

1. Registrar una cuenta pendiente, sin confiar en roles enviados por el navegador.
2. Autenticar con hash seguro y sesiones revocables; limitar intentos.
3. Aprobar/rechazar cuentas con permisos y auditoría.
4. Proteger rutas y mostrar el estado de aprobación al usuario.
5. Probar usuarios pendientes, suspendidos, sesiones revocadas y acceso cruzado.

La primera cuenta administrativa y los docentes se crean mediante CLI interactiva, sin credenciales públicas. Incluye paneles iniciales por perfil. Quedan pendientes recuperación de contraseña, verificación de correo y gestión web completa de cuentas/permisos antes de operar con estudiantes reales.

## Entrega 3 — Aula y operación del contenido

Avance del 04/10/2026: [portal privado](15-private-portal.md) con navegación independiente, métricas reales, consulta de usuarios/cursos, matrícula administrativa, asignación de docentes y consulta de progreso persistido. Cada acción se autoriza en NestJS y las escrituras conservan auditoría.

Ampliación codificada el 05/10/2026, pendiente de pruebas del propietario: solicitudes
de inscripción, acceso institucional por módulos/plazo, revocación, aula de lectura
y registro de avance. Preparación en la [guía del aula](16-enrollment-classroom.md).

Pendientes: edición de cursos/biblioteca, video y archivos privados. Incorporar archivos privados solo con almacenamiento y permisos definidos. La matrícula manual no simula pagos ni concede acceso a módulos privados: requiere una autorización separada.

## Entrega 4 — Flujos de la guía de reunión

Evaluaciones, tareas, clases con enlaces Meet/Zoom y asistencia, grabaciones con vencimiento, pagos QR verificables e idempotentes, certificados, comunicación y reportes. Priorizar por necesidad confirmada con Pablo Rivero; no simular cobros exitosos para sustituir una integración real.

Cerrar antes las políticas de aprobación de examen, pago y renovación, vencimientos y certificación. Las recomendaciones pueden comenzar por reglas si el cliente lo acepta; una red neuronal requiere objetivo y datos evaluables.

## Despliegue empresarial

Depende de inventario real de equipos, conexión, disponibilidad, responsable operativo, almacenamiento y concurrencia objetivo. Medir carga, revisar seguridad, probar backup/restore, documentar operación y obtener aceptación funcional antes de publicar para estudiantes reales.

La app móvil se mantiene fuera del alcance hasta finalizar el proyecto web. El diseño adaptable del sitio sí forma parte de la web.
