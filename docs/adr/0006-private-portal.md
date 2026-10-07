# ADR 0006 — Portal privado y operación académica inicial

Aceptado, 04/10/2026. Alcance confirmado: solicitudes, consulta de usuarios/cursos,
matrícula administrativa, asignación de docentes y dashboard del estudiante inscrito.

El sitio público mantiene sus URL bajo un grupo de rutas (public). `/portal`
introduce un layout propio con navegación lateral, cuenta y tema. Comparte Next.js,
sesión e identidad visual; no requiere dominio, servidor o servicio adicional.
Las rutas antiguas `/mi-cuenta` redirigen al portal correspondiente.

NestJS incorpora un módulo academic para consultas de gestión y operaciones sobre
inscripciones/asignaciones. Reutiliza la autorización del módulo identity. El cliente
solo propone IDs: la API comprueba rol, permiso, usuario aprobado, perfil docente,
curso y propiedad. Las consultas se paginan y acotan; el estudiante solo consulta
sus inscripciones, el docente sus asignaciones y administración el ámbito autorizado.

La migración incremental 0003 añade permisos y auditoría de asignaciones docentes.
Matrícula manual y asignación son transaccionales, idempotentes ante repetición y
registran actor/motivo. No reactivan matrículas suspendidas ni simulan pagos.
La matrícula no crea concesiones a módulos: el acceso privado sigue dependiendo de
vigencia, cobertura y progresión. En esta entrega se consulta progreso persistido;
no se inventan avances ni se implementa aún el reproductor/aula.

Los indicadores se calculan en PostgreSQL. Las listas filtran por sesión, no por un
ID de usuario proporcionado por el cliente. Los dashboards no exponen cuerpos de
lecciones, enlaces privados, archivos, contraseñas ni tokens. Los apartados de pagos,
evaluaciones y edición de contenido se mantienen fuera de esta entrega.
