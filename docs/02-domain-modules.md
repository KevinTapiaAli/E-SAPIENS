# Módulos de dominio

## Core inicial

| Módulo          | Responsabilidad                                         |
| --------------- | ------------------------------------------------------- |
| identity        | usuarios, estados, sesiones, verificación, recuperación |
| authorization   | roles, permisos, policies                               |
| catalog         | categorías, cursos públicos, páginas/FAQ                |
| academics       | cursos, módulos, lecciones, reglas, prerrequisitos      |
| library         | obras, autores, versiones, secciones, referencias       |
| enrollment      | inscripciones, acceso, vigencias                        |
| progress        | progreso y desbloqueo                                   |
| assessments     | evaluaciones, preguntas, intentos, respuestas           |
| assignments     | tareas, entregas, archivos, retroalimentación           |
| live-classes    | agenda, asistencia, enlaces, grabaciones                |
| commerce        | planes, órdenes, pagos, webhooks, reembolsos            |
| certificates    | plantillas, emisión, verificación, PDF                  |
| notifications   | in-app, email, WhatsApp, preferencias                   |
| community       | comentarios, valoraciones, favoritos                    |
| reporting       | dashboards, vistas de lectura, exports                  |
| audit           | trazabilidad administrativa/financiera                  |
| recommendations | reglas y futura interfaz ML                             |

## Dependencias a vigilar

- `commerce` puede conceder derechos en `enrollment`, pero no debe editar tablas de otros dominios desde controladores.
- `progress` consulta reglas de `academics` y derechos de `enrollment`.
- `certificates` consulta cumplimiento académico; la generación PDF va al worker.
- `notifications` recibe eventos, no debe contener lógica de compra o académico.

## Vertical slices

Construir casos de uso completos. Ejemplo `complete-lesson`:
HTTP -> auth -> use case -> policy acceso -> transacción -> PostgreSQL -> evento outbox -> response -> UI.
