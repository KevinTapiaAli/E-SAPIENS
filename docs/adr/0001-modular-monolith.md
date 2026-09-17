# ADR-0001 — Monolito modular antes que microservicios

**Estado:** Aceptado

## Contexto

El producto tiene numerosos dominios, pero el equipo necesita velocidad de desarrollo, transacciones fuertes y operación simple.

## Decisión

Construir una API NestJS modular en un único despliegue lógico, con worker separado para jobs.

## Consecuencias

- Menor complejidad operativa.
- Transacciones simples.
- Refactoring entre dominios accesible.
- Límites claros mediante módulos.

* El escalado por dominio no es independiente inicialmente.

## Señales para extraer un servicio

Carga aislable significativa, necesidad operacional separada, ownership de equipo distinto o requerimiento tecnológico que no encaje en el monolito.
