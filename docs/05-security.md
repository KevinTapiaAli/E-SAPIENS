# Seguridad

## Auth

- Web: cookie de sesión/refresh `HttpOnly`, `Secure`, `SameSite` apropiado.
- Mobile: access token corto + refresh token rotatorio según estrategia final.
- Hash de refresh/recovery tokens en persistencia.
- Revocación y vencimiento.
- Argon2id para nuevas contraseñas; compatibilidad/migración desde bcrypt.

## Authorization

No basta `role === admin`. Usar permisos y ownership/contexto:

- rol;
- permiso;
- estado del usuario;
- asignación del docente;
- inscripción;
- vigencia;
- cobertura del plan;
- propiedad del recurso.

## Video privado

- S3 privado + CloudFront OAC.
- Signed cookies para HLS; signed URL para un objeto.
- Expiración corta.
- La API valida acceso antes de emitir credenciales temporales.
- No guardar signed URLs en DB.
- No prometer prevención absoluta de copia/pantalla.

## Uploads

- allowlist MIME/extensión;
- límite de tamaño;
- nombres generados en servidor;
- bucket privado;
- escaneo cuando se habilite producción;
- no servir contenido activo peligroso desde el mismo dominio principal.

## Aplicación

- Helmet;
- rate-limit;
- CORS allowlist;
- CSRF cuando aplique;
- SQL parametrizado;
- límites de payload;
- logs sin secretos;
- error responses sin stack trace en producción.

## CI

- secret scanning;
- dependency audit;
- SAST;
- branch protection;
- revisión especial de auth/pagos/migraciones.
