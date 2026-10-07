# Portal privado y gestión académica

La entrega original descrita aquí se amplía el 05/10/2026 con
[solicitudes de inscripción, autorizaciones por módulo y aula de lectura](16-enrollment-classroom.md).
Esa ampliación está pendiente de comprobación por el propietario; la evidencia del
04/10 que aparece más abajo corresponde al portal anterior.

Entrega del 04/10/2026. El inicio de sesión conduce a `/portal`, que selecciona
un perfil autorizado. El portal tiene su propia barra lateral, cabecera, cuenta,
tema y navegación adaptable; el sitio público conserva sus URL. Ambos pertenecen
a la misma aplicación Next.js y comparten sesión. No requieren otro dominio.

## Funciones disponibles

| Perfil         | Secciones y operaciones                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Administración | Vista general, solicitudes, consulta/búsqueda de usuarios y cursos, matrícula de estudiantes aprobados, asignación de docentes y cuenta. |
| Docente        | Vista general, cursos asignados, cantidad de estudiantes con matrícula activa y cuenta.                                                  |
| Estudiante     | Vista general, cursos inscritos, progreso persistido por curso y cuenta.                                                                 |

Las métricas y gráficos proceden de PostgreSQL. No hay cifras de ejemplo en el
dashboard. Sin inscripciones/asignaciones se muestra un estado vacío. Un usuario
con varios perfiles puede cambiar entre los que le fueron autorizados.
Las rutas anteriores `/mi-cuenta` y `/mi-cuenta/:role` redirigen al portal.

## Preparación sin perder datos

Con PostgreSQL y Redis disponibles, ejecutar desde la raíz:

```powershell
pnpm.cmd db:migrate
pnpm.cmd dev
```

La migración incremental 0003 añade permisos académicos y registra responsable,
motivo y auditoría de las asignaciones docentes. Conserva los registros existentes;
las asignaciones históricas pueden tener esos campos vacíos. No requiere reiniciar
la base ni crear otra cuenta administrativa. Para una instalación nueva, seguir
primero la [guía de identidad](14-identity-and-workspaces.md).

## Recorrido de uso

1. Entrar en `/login` con una cuenta administrativa aprobada.
2. En **Solicitudes**, aprobar al estudiante y registrar el motivo de la decisión.
3. En **Matrículas → Registrar matrícula**, buscar y seleccionar al estudiante
   aprobado, seleccionar un curso publicado, escribir el motivo y confirmar.
4. En **Cursos y docentes → Asignar docente a un curso**, seleccionar un docente
   aprobado con perfil docente, el curso y el motivo; confirmar.
5. Cerrar sesión e ingresar con el estudiante. El curso aparece en **Mis cursos**
   y en el resumen, junto con su docente y progreso registrado.
6. Ingresar con el docente. Solo aparecen los cursos que tiene asignados.

La aprobación de cuenta no matricula automáticamente. Una matrícula administrativa
no registra un pago ni concede acceso a módulos privados. Repetir la misma matrícula
activa o asignación devuelve el registro existente sin duplicarlo. Una matrícula
suspendida, retirada o completada no se reactiva automáticamente.

Las listas incluyen búsqueda y paginación. Las tablas permiten desplazamiento
horizontal en pantallas pequeñas. En teléfonos, el botón de menú abre la navegación;
se cierra al elegir sección, mediante su botón, tocando fuera o con Escape.

## API académica

Rutas bajo `/api/v1/academic`, documentadas en Swagger:

| Método y ruta           | Autorización / propósito                                                                |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `GET /overview/:role`   | Rol y permiso del perfil: métricas, distribución y cuatro cursos del ámbito autorizado. |
| `GET /courses?role=...` | Cursos propios del estudiante, asignados al docente o consulta administrativa.          |
| `GET /people`           | Administración con `academic.read`; datos de cuenta, nunca credenciales.                |
| `GET /enrollments`      | Administración con `academic.read`; estudiante, curso, estado, fecha y motivo.          |
| `POST /enrollments`     | Administración con `academic.enroll`; estudiante aprobado y curso publicado.            |
| `POST /assignments`     | Administración con `academic.assign`; docente aprobado con perfil y curso no archivado. |

Las listas aceptan `q` (máximo 100 caracteres), `cursor` UUID y `limit` de 1 a 24
(12 predeterminado). Personas permite `kind=estudiante|docente|todos` y
`state=aprobado|pendiente|rechazado|suspendido|todos`.
Las escrituras reciben `{ courseId, personId, reason }`; el motivo exige 5–500
caracteres. NestJS valida cada entidad y la autorización actual de la sesión.
Errores de dominio incluyen `COURSE_NOT_FOUND`, `COURSE_NOT_AVAILABLE`,
`PERSON_NOT_ELIGIBLE` y `ENROLLMENT_NOT_ACTIVE`.

Next.js usa Server Components para lecturas privadas y un puente cerrado
`/api/academic/*` para búsquedas del formulario y escrituras. Aplica límite de
cuerpo de 8 KiB y validación de origen para escrituras. Las respuestas privadas
no se almacenan en caché. El navegador nunca consulta PostgreSQL.

Las operaciones se ejecutan en transacciones y registran actor/motivo. La sesión
determina la propiedad; los IDs enviados desde un formulario no conceden permisos.
No se entregan cuerpos de lecciones, archivos ni enlaces privados. Los instantes
se almacenan en UTC y las fechas se presentan con la zona de la cuenta.

## Validación y límites

Las pruebas de integración cubren permisos, aislamiento entre usuarios, paginación,
progreso publicado, idempotencia, auditoría, elegibilidad y rechazo de reactivación
de matrículas. Las fixtures viven en una transacción que se revierte al finalizar.

Verificación local del 04/10/2026:

- Formato, lint, TypeScript y build de web/API aprobados.
- Siete pruebas unitarias y 31 pruebas de integración aprobadas en el repositorio.
- Edge: matrícula administrativa y asignación docente reflejadas en los portales
  del estudiante y docente, con métricas y curso propios.
- Acceso administrativo rechazado para estudiante; consulta de usuarios rechazada
  para docente; rutas del puente no autorizadas rechazadas.
- Navegación de escritorio y móvil a 320 px, temas claro/oscuro, cierre del menú
  con Escape y restauración de foco, sin desbordamiento horizontal observado.
- Redirección de rutas anteriores y retorno al login después del cierre de sesión.
- Inicio y catálogo público conservados; sin errores de aplicación observados.
- Cuentas temporales ausentes al cerrar la prueba; los tres cursos y las dos
  fichas existentes se conservaron. Las capturas locales están en `.tmp/verification/`
  y no se versionan. Las verificaciones no sustituyen una prueba de carga.

El portal permite gestionar el alcance descrito. El reproductor/aula, registrar
avance desde una lección, edición de cursos, evaluaciones, pagos, certificados y
notificaciones todavía requieren entregas posteriores. El porcentaje mostrado usa
lecciones publicadas completadas sobre lecciones publicadas del curso; no certifica
aprobación académica ni representa cobertura de acceso o estado de pago.

Véase [ADR 0006](adr/0006-private-portal.md). La publicación empresarial sigue sujeta
a las comprobaciones de seguridad, recuperación, infraestructura y carga indicadas
en el [roadmap](08-roadmap.md).
