# Convenciones API REST

Base: `/api/v1`

## Recursos ejemplo

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /courses
GET    /courses/:courseId
GET    /me/enrollments
POST   /lessons/:lessonId/complete
POST   /evaluations/:evaluationId/attempts
POST   /attempts/:attemptId/submit
POST   /orders
POST   /payments/:provider/webhook
GET    /me/certificates
```

## Reglas

- Recursos en plural.
- IDs UUID como path params cuando corresponda.
- No incluir acciones arbitrarias si una transición de recurso es más clara; usar acción explícita cuando represente un comando de dominio (`complete`, `submit`, `approve`).
- OpenAPI obligatorio.
- Validación de todos los inputs.
- Paginación cursor-based en listados grandes.
- UTC/ISO-8601 en API.
- Códigos de error estables.
- `requestId` en logs y errores.

## Contratos

`packages/contracts` puede contener tipos/esquemas de transporte compartidos, pero no entidades ORM ni reglas de negocio.

## Idempotencia

Pagos, webhooks y comandos que puedan repetirse deben soportar deduplicación. Nunca asumir “el proveedor solo enviará una vez”.
