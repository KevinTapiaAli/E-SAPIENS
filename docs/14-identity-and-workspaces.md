# Identidad web y espacios por perfil

Entrega del 04/10/2026. Implementa el acceso inicial de estudiante, docente y
administrador solicitado en la guía del Ing. Pablo Rivero. Conserva Next.js,
NestJS, PostgreSQL, Redis y la identidad visual existente.

## Funciones disponibles

| Perfil                                | Funciones de esta entrega                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Visitante                             | Solicitar cuenta de estudiante y explorar catálogo/biblioteca.                                |
| Estudiante aprobado                   | Iniciar/cerrar sesión y consultar sus inscripciones.                                          |
| Docente aprobado                      | Iniciar/cerrar sesión y consultar sus cursos asignados.                                       |
| Administrador / administrador general | Consultar totales, paginar solicitudes y aprobar/rechazar estudiantes con motivo y auditoría. |

El alcance inicial de esta tabla se amplió con el [portal privado](15-private-portal.md):
navegación propia, consulta de usuarios/cursos, matrículas, asignación docente y progreso persistido.
Una persona con varios roles asignados puede cambiar entre sus espacios autorizados.
El formulario de login es único: un selector de perfil nunca concede privilegios.

## Preparación local conservando datos

Desde la raíz, con PostgreSQL y Redis existentes en ejecución:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd db:check
pnpm.cmd db:migrate
pnpm.cmd account:create administrador_general
pnpm.cmd account:create docente
pnpm.cmd dev
```

`account:create` solicita correo, nombres, apellidos, especialidad del docente y
contraseña confirmada de 15–128 caracteres con entrada oculta. Utiliza correos que
controles y contraseñas distintas. Verifica la autorización institucional antes de
dar de alta una cuenta. También acepta `administrador` o `estudiante`.
No existen credenciales predeterminadas. Rechaza correos existentes sin sobrescribirlos.
Solo el operador que ya tiene acceso a la base debe ejecutar esta herramienta.
No pasar contraseñas como argumentos ni guardarlas en archivos versionados.

En una instalación nueva, ejecutar `db:init` **solo si no existe el esquema lms**,
y después `db:migrate`. La migración 0002 conserva los datos y añade roles/permisos.
Se registra con checksum: repetir `db:migrate` verifica lo ya aplicado sin ejecutarlo
otra vez. No editar migraciones aplicadas. Fuera de local, el operador debe comprobar
el destino de DATABASE_URL y su backup antes de ejecutar migraciones.

Las cuentas creadas por CLI quedan aprobadas, con historial, sin marcar el correo
como verificado. No se envían correos ni se asignan cursos/matrículas automáticamente.
El alta inicial usa el propio ID creado como actor de bootstrap; la identidad del
operador debe conservarse en la auditoría de acceso a la infraestructura.

## Demostración

1. Abrir `/registro` y solicitar una cuenta de estudiante.
2. Intentar entrar con su contraseña correcta: se explica que falta aprobación.
3. Ingresar en `/login` con la cuenta administrativa creada mediante CLI.
4. Revisar la solicitud, seleccionar aprobar, escribir el motivo y guardar.
5. Cerrar sesión e ingresar con el estudiante: aparece su espacio y sus inscripciones.
6. Cerrar sesión e ingresar con el docente: aparecen solo sus asignaciones reales
   de `lms.curso_docentes`; sin ellas se presenta un estado vacío.
7. Intentar abrir `/portal/administrador` desde un estudiante/docente: se deniega.
   Tras cerrar sesión, volver a una ruta privada exige autenticarse.

## API

| Ruta bajo `/api/v1/identity` | Regla                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `POST /register`             | email, password, firstName, lastName; estudiante pendiente; respuesta 202 genérica.                                    |
| `POST /login`                | Cuenta aprobada y contraseña válida; identidad pública y cookie.                                                       |
| `POST /logout`               | Revoca sesión actual y limpia cookie.                                                                                  |
| `GET /me`                    | Sesión válida; identidad, roles y permisos actuales.                                                                   |
| `GET /dashboard/:role`       | Rol y permiso explícito; datos propios/asignados.                                                                      |
| `GET /pending?cursor=UUID`   | Rol administrativo + identity.review; 20 solicitudes por página.                                                       |
| `POST /accounts/:id/review`  | Rol administrativo + identity.review; decision aprobar/rechazar y reason de 5–500 caracteres; transacción y auditoría. |

## Seguridad y configuración

Todas las escrituras exigen Origin exactamente igual a APP_URL; se rechazan orígenes
ausentes y Sec-Fetch-Site ajenos. El navegador usa el puente cerrado de Next.js
`/api/identity/*`, que solo reenvía la cookie de sesión esperada y limita el cuerpo
a 8 KiB. No se habilita CORS ni se reenvían headers arbitrarios del navegador.
Las lecturas privadas usan no-store. No hay tokens en JSON ni en localStorage.

La sesión usa 32 bytes aleatorios, digest SHA-256 persistido y caducidad absoluta de
ocho horas. Login rota la sesión presentada; logout la revoca. No se implementa aún
«cerrar todas las sesiones». El estado de cuenta y los permisos se comprueban en cada
petición: una cuenta suspendida pierde acceso inmediatamente.

Argon2id: 19 MiB, dos iteraciones, paralelismo uno y sal aleatoria. Bcrypt legado se
actualiza tras un login correcto; no se aceptan contraseñas bcrypt de más de 72 bytes
por su truncamiento. Las contraseñas nuevas permiten frases de 15–128 caracteres.
HTTP local usa cookie esapiens_session, HttpOnly y SameSite=Lax. HTTPS usa
__Host-esapiens_session, Secure, Path=/ y sin Domain. La API rechaza producción sin
HTTPS en APP_URL.

Redis limita login a 10/cuenta y 100/dirección cada 15 minutos; registro a 3/cuenta
y 30/dirección. Las claves usan identificadores hasheados y expiran. Si Redis falla,
no se omite el control: se responde con error de disponibilidad. La dirección es la
conexión directa a NestJS; detrás de Next.js se comparte ese límite. Antes de publicar,
definir un proxy confiable y ajustar límites con la concurrencia medida. No confiar
sin más en X-Forwarded-For recibido desde Internet.

Local: APP_URL=http://localhost:3000 y API_URL=http://localhost:4000. Si cambia el
origen, actualizar APP_URL en web y API. Next lee el .env raíz sin reemplazar variables
ya definidas. Las antiguas SESSION_SECRET / ACCESS_TOKEN_SECRET / REFRESH_TOKEN_SECRET
no se utilizan ni se necesitan para sesiones opacas. No publicar archivos .env.

## Verificación y pendientes

`pnpm test` verifica Argon2id y bcrypt. `pnpm test:e2e` ejercita PostgreSQL/Redis:
registro, aprobación, auditoría, sesiones, caducidad, revocación, CSRF, límites de
intentos, permisos retirados y aislamiento entre cuentas. Los datos SQL de prueba
viven en una transacción con rollback; las claves Redis tienen prefijo único y caducan.
CI aplica migraciones incrementales después del esquema inicial efímero.

Pendiente: recuperación de contraseña y verificación de correo, creación web de
docentes/gestión de permisos, suspensión desde UI, aula y registro de avance desde
lecciones, evaluaciones, materiales privados, asistencia, pagos y notificaciones.
La aprobación no concede automáticamente acceso académico ni verifica el correo.
El endpoint inicial de identidad conserva su límite de 50 cursos. El portal actual
usa listas paginadas del módulo académico (12 por página, máximo 24).
Antes de estudiantes reales: TLS, proxy, revisión de seguridad, base con mínimo
privilegio, backups/restauración, recuperación, retención de sesiones y carga medida.

Decisión técnica: [ADR 0005](adr/0005-web-identity.md).

### Evidencia local de esta entrega

- Instalación con lockfile congelado, formato, lint, TypeScript y build de web/API.
- Siete pruebas unitarias y 26 pruebas E2E aprobadas, incluyendo las del catálogo.
- Navegador Edge: registro pendiente, acceso denegado antes de aprobación,
  aprobación administrativa, login de estudiante/docente/administrador y logout.
- Acceso cruzado denegado; después del logout, una ruta privada vuelve al login.
- Revisión en escritorio y a 320 px, temas claro/oscuro y sin desbordamiento observado.
- Puente Next.js: origen ajeno 403, ruta no permitida 404 y cuerpo excesivo 413.

La comprobación visual utilizó cuentas temporales dentro de una transacción SQL;
no instala usuarios demo ni contraseñas de acceso. Estas verificaciones no sustituyen
pruebas de carga ni una auditoría de producción.
