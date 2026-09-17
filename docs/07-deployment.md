# Despliegue y operación

## Entornos

- local
- test/CI
- staging
- production

Cada entorno tiene secretos y base independientes.

## Producción recomendada (AWS-oriented, intercambiable)

```text
DNS/HTTPS
  -> CDN/WAF
      -> Next.js hosting
      -> CloudFront private media
            -> S3 private bucket
  -> Load Balancer/API endpoint
      -> ECS/Fargate NestJS API
      -> ECS/Fargate Worker
      -> RDS PostgreSQL
      -> ElastiCache Redis
      -> SES / WhatsApp provider
      -> Secrets Manager
```

Si el equipo prioriza simplicidad inicial, la web puede desplegarse en Vercel y mantener API/DB/storage desacoplados. La arquitectura de código no debe depender de un proveedor específico salvo adapters de infraestructura.

## Requisitos operativos

- Dockerfile multi-stage por app desplegable.
- imágenes versionadas por commit/tag.
- migrations como job controlado antes del rollout.
- health/readiness probes.
- rolling deploy.
- backup/PITR.
- restore drill.
- logs centralizados.
- métricas y alertas.
- rollback documentado.

## Secretos

Nunca en `.env` versionado. `.env.example` solo contiene nombres y ejemplos no sensibles.
