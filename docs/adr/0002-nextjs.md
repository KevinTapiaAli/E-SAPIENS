# ADR-0002 — Next.js para la web

**Estado:** Aceptado

## Contexto

La plataforma combina catálogo/páginas públicas con dashboards privados.

## Alternativas

- React + Vite.
- React Router Framework Mode.
- Nuxt/Vue.
- Next.js.

## Decisión

Next.js App Router para unificar SEO, SSR/streaming, routing y aplicación privada. La lógica de negocio queda en NestJS.

## Motivo

React+Vite ofrece máximo control y sería excelente para un dashboard privado, pero exige resolver por separado el renderizado/SEO de la superficie pública. React Router Framework Mode es viable, pero el equipo ya tiene una propuesta React/Next y conviene reducir variabilidad.

## Guardrail

No convertir Next.js en un segundo backend de negocio. No acceder a PostgreSQL desde la web.
