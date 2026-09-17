# Revisión de base de datos existente

## Lo que está bien

- PostgreSQL y UUID.
- `citext` para email/username.
- dominios para dinero y notas.
- separación entre usuario, compra, inscripción y acceso.
- reglas configurables para avance.
- snapshot comercial de compras.
- claves compuestas para coherencia curso/módulo/lección.
- transacciones y funciones para flujos críticos.
- auditoría y protección de registros.
- archivos fuera de PostgreSQL.
- índices parciales para casos relevantes.

## Mejoras antes de producción

### 1. Separar esquema y demo

El archivo original mezcla instalación y datos ficticios. Este starter deja solo el esquema en `database/migrations/0001_initial_schema.sql`.

Los datos demo con claves conocidas deben vivir solo en tooling local privado/efímero, nunca como configuración productiva.

### 2. Migraciones reales

Adoptar un historial incremental:

```text
database/migrations/
  0001_initial_schema.sql
  0002_webhook_inbox.sql
  0003_outbox.sql
  ...
```

Nunca reescribir `0001` después de compartirla/aplicarla.

### 3. Webhook inbox

Agregar entidad para almacenar eventos externos con `provider`, `external_event_id`, hash/raw protegido, estado, intentos y timestamps. Restricción única por proveedor+evento.

### 4. Transactional outbox

Agregar eventos internos pendientes dentro de la misma transacción de negocio. El worker los publica/consume y marca enviados. Evita “DB confirmó pero correo/evento se perdió”.

### 5. Password hashing

La DB actual usa bcrypt. Mantener compatibilidad para usuarios existentes, pero usar Argon2id para nuevas credenciales y rehash progresivo cuando un login bcrypt sea válido.

### 6. Índices

El esquema ya crea índices de FKs e índices específicos. No agregar decenas por intuición. Medir queries reales y usar EXPLAIN ANALYZE.

### 7. RLS

No es requisito si solo el backend NestJS se conecta a PostgreSQL con credenciales privadas y aplica autorización correctamente. Si en el futuro se habilita acceso directo desde cliente/servicio tipo BaaS, diseñar RLS antes de ello.

### 8. Multi-tenancy

No añadir `tenant_id` a 74 tablas “por si acaso”. E-SAPIENS hoy se plantea como una plataforma de una organización. Si aparece el requisito SaaS multiempresa, hacer ADR y migración deliberada.

### 9. Backups

Producción debe tener backups automáticos, PITR si el proveedor lo permite y pruebas periódicas de restauración. Un backup no verificado no cuenta como estrategia de recuperación.
