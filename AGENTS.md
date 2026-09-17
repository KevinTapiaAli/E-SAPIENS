# AGENTS.md — Reglas para agentes de código

## Objetivo

Mantener E-SAPIENS coherente, seguro, probado y desplegable.

## Reglas innegociables

- Leer `PROMPT_MAESTRO.md` y `docs/` antes de cambios estructurales.
- NestJS es la autoridad de negocio. El frontend no accede directo a PostgreSQL.
- Mantener arquitectura modular por dominio.
- No introducir microservicios sin ADR y motivo medible.
- No almacenar secretos ni credenciales reales en Git.
- No editar migraciones ya aplicadas; crear una nueva.
- No confiar en IDs/roles/precios/notas enviados por el cliente como autoridad.
- Todo webhook debe ser verificable e idempotente.
- Toda operación financiera multi-write debe ser transaccional.
- Ejecutar pruebas y typecheck antes de declarar una tarea terminada.
- Si el comportamiento cambia, actualizar documentación/ADR.

## Convenciones

- TypeScript `strict`.
- Nombres de dominio explícitos.
- Preferir composición sobre herencias profundas.
- Evitar helpers genéricos prematuros.
- No `any` salvo frontera externa justificada y validada.
- Errores de dominio con códigos estables.
- UTC en persistencia de instantes; presentar zona del usuario en UI.
