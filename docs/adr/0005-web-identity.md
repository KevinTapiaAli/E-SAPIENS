# ADR 0005 — Identidad web y paneles por perfil

Estado: aceptado para implementación local, 2026-10-04.

La guía exige aprobación administrativa y perfiles de estudiante, docente y
administrador. NestJS conserva la autoridad de identidad, permisos y consultas.
Se reutilizan usuarios, roles, permisos, sesiones e historial del esquema existente.
La migración 0002 añade únicamente roles y permisos; no modifica la migración inicial.

Las sesiones usan tokens aleatorios de 256 bits, digest SHA-256 en PostgreSQL,
caducidad absoluta de ocho horas y revocación al cerrar sesión. Cookies HttpOnly,
SameSite=Lax, Secure y prefijo __Host- en producción. Cada consulta vuelve a
comprobar estado, roles y permisos; cambiar un rol en el navegador no concede acceso.
Argon2id protege contraseñas nuevas (19 MiB, dos iteraciones, paralelismo uno);
bcrypt heredado se verifica y actualiza al iniciar sesión correctamente.

Next.js expone un puente HTTP limitado a identidad: mismo origen para el navegador,
sin acceso SQL ni reglas de negocio. Ambos extremos validan Origin en escrituras.
No se habilita CORS. Redis limita intentos por cuenta y por dirección del cliente
directo de NestJS. Sin proxy de confianza configurado se comparte el límite de
dirección del servidor Next.js; no se confía en X-Forwarded-For del navegador.
Es deliberadamente conservador; ajustar topología y límites tras medir concurrencia.

El registro público solo solicita una cuenta de estudiante pendiente. La aprobación
exige rol administrativo y permiso identity.review, se ejecuta con historial y
actor de auditoría dentro de una transacción. El alta de docentes y administradores
se realiza con una CLI interactiva de operador, sin contraseñas predeterminadas.
La CLI no transforma ni sobrescribe usuarios existentes.

Esta entrega incluye paneles iniciales de consulta y revisión de solicitudes.
No concede matrícula ni acceso a material privado por el mero inicio de sesión.
Correo verificado, recuperación de contraseña, edición académica, pagos y asistencia
requieren siguientes entregas; la aprobación no equivale a verificación de correo.

Referencias: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
