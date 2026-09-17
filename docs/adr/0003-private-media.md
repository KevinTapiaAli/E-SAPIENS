# ADR-0003 — Archivos/video privado fuera del servidor web

**Estado:** Aceptado

## Decisión

Almacenar archivos en object storage privado y servir contenido restringido mediante CDN con credenciales temporales.

## Motivo

Evita cargar el servidor de aplicación, permite CDN, expiración y control centralizado de acceso.

## Nota

YouTube oculto o enlaces de Drive pueden servir para una demo, pero no garantizan acceso exclusivo por cuenta. Para producción, priorizar S3 privado + CloudFront o proveedor equivalente.
