# Estrategia de pruebas y calidad

## Pirámide práctica

Estado de la primera entrega: 2 pruebas unitarias de salud y 17 pruebas E2E de API (incluyen las 14 de catálogo/biblioteca contra PostgreSQL). CI instala la migración original en una base efímera. El seed demo no es requisito de las pruebas; sus fixtures se revierten con `ROLLBACK`. La automatización de UI en CI y las pruebas de carga siguen pendientes.

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

## Evidencia local de la primera entrega (01/10/2026)

Se verificaron instalación con lockfile congelado, formato, lint, TypeScript, build de ambas aplicaciones, 2 pruebas unitarias y 17 pruebas E2E. La inicialización del esquema se comprobó en `esapiens_test`, sin reiniciar `esapiens`. Los conteos de la demo se conservaron después de las pruebas: 3 cursos y 2 fichas públicas.

Revisión con navegador Edge automatizado: portada, búsqueda de cursos, temario, búsqueda de biblioteca, ficha bibliográfica, menú en pantalla de 390 px, lista sin resultados, recurso inexistente y aviso de aula pendiente. Se comprobó además el estado de API no disponible mediante una instancia web aislada en otro puerto, sin detener PostgreSQL. La navegación de las rutas verificadas no produjo errores de aplicación; se corrigió el aviso de Next.js sobre `data-scroll-behavior`.

Las capturas de esta ejecución quedan localmente en `.tmp/verification/` (excluido de Git). Esta revisión no equivale a una auditoría completa de accesibilidad, seguridad o carga. El workflow está preparado para GitHub Actions, pero su ejecución remota queda pendiente de publicar los cambios con autorización.
