# Estrategia de pruebas y calidad

## Pirámide práctica

- Unit: reglas de dominio y use cases.
- Integration: repositorios, transacciones, funciones SQL, queues.
- API E2E: endpoints reales + PostgreSQL de test.
- UI E2E: Playwright en los flujos de mayor valor.
- Load: k6 antes de release.

## Casos críticos

1. Usuario pendiente no accede aunque conozca su password.
2. Estudiante no consulta datos de otro estudiante.
3. Docente solo administra cursos asignados.
4. Pago repetido no duplica inscripción/acceso.
5. Reembolso aplica la política acordada sin corrupción financiera.
6. Módulo bloqueado no se abre manipulando el frontend.
7. Grabación vencida no entrega signed URL/cookie.
8. Entrega de examen no puede mutarse ilegalmente después de cierre.
9. Migración puede instalar una DB vacía y el rollback/forward path está documentado.
10. Worker tolera reintentos sin duplicar mensajes/certificados.

## Gates de PR

- lint;
- format;
- typecheck;
- tests;
- build;
- migrations validation;
- security scan.

## Calidad de código

No medir profesionalismo por número de capas. Cada abstracción debe reducir acoplamiento o aumentar testabilidad de un caso real.
