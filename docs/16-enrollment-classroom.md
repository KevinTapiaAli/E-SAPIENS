# Inscripción a materias, acceso y aula

Código añadido el 05/10/2026. **Pendiente de pruebas por el propietario.** No se
ejecutaron migraciones, semillas, tests, lint, TypeScript, build ni navegador en
esta entrega, según la instrucción recibida. Los resultados anteriores del portal
no validan automáticamente estas ampliaciones.

## Preparación para tu demostración

Con PostgreSQL y Redis en ejecución, desde la raíz:

```powershell
# Aplicar la migración incremental 0004, conservando la base existente.
pnpm.cmd db:migrate

# Opcional: añadir los cursos ficticios si no estaban presentes.
pnpm.cmd db:seed:demo

# Opcional: completar el texto vacío de las lecciones ficticias.
pnpm.cmd db:seed:classroom

# Reiniciar web y API para cargar el código nuevo.
pnpm.cmd dev
```

Si tienes servidores de una compilación anterior en ejecución, detén esos procesos
antes de iniciar `dev` para liberar 3000/4000. No ejecutes `db:init` sobre la base
existente. No se requieren dependencias nuevas. Usa tus cuentas; no se crean
contraseñas demo ni cuentas administrativas adicionales.

El nuevo seed solo completa textos vacíos de las cinco lecciones demo conocidas.
Crea reglas de avance por lecturas para esos cursos cuando no había reglas;
conserva cualquier configuración previa. Si el curso ya exige un examen, esa
exigencia continúa y puede bloquear el siguiente módulo. No modificar reglas reales
para aparentar que una evaluación fue aprobada.

## Recorrido para presentar al ingeniero

1. **Estudiante aprobado:** entrar en `/login` y abrir **Inscribirme**. Buscar
   `[Demostración] Ciencias naturales` y pulsar **Solicitar inscripción**.
2. **Administrador:** entrar con su cuenta, abrir **Solicitudes de materias**,
   aprobar con motivo y abrir **Gestionar módulos y acceso**.
3. Seleccionar los módulos publicados que correspondan, indicar días y motivo,
   y confirmar el acceso. Si ya había una matrícula directa, abrirla desde
   **Matrículas y acceso**, pulsando el nombre del estudiante.
4. **Estudiante:** abrir **Mis cursos → Ver materia y acceso**. Mostrar el plazo,
   las lecciones disponibles y la explicación del bloqueo del segundo módulo.
5. Abrir y leer las dos lecciones del primer módulo. Marcar cada una como completada
   y volver al temario. Con cobertura del segundo módulo y las reglas demo de
   lectura, se habilita el siguiente módulo.
6. Volver al dashboard o **Mi progreso** y observar el avance persistido.
7. **Administrador:** mostrar el historial y, si se desea probar revocación,
   revocar una autorización de prueba con motivo. El estudiante deberá recargar;
   la próxima lectura al servidor vuelve a comprobar acceso.

La segunda cuenta puede usarse en una ventana privada o en otro navegador para
mantener ambas sesiones durante la presentación. La demo registra datos reales
en tu base local cuando tú confirmas las operaciones.

## Qué significa cada estado

| Estado                                    | Qué permite / siguiente acción                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| Solicitud pendiente                       | Esperar revisión. Todavía no hay derecho de acceso.                           |
| Solicitud rechazada                       | Leer el motivo y contactar con administración. No se reenvía automáticamente. |
| Matrícula activa sin autorización         | Ver el temario y consultar la falta de cobertura; no abrir contenido.         |
| Módulo disponible                         | Abrir las lecciones publicadas y registrar avance compatible.                 |
| Acceso programado                         | Esperar el inicio del período registrado.                                     |
| Acceso vencido                            | Solicitar renovación a administración.                                        |
| Acceso revocado                           | Solicitar revisión; otra autorización vigente puede seguir dando cobertura.   |
| Módulo anterior pendiente                 | Completar las lecciones y evaluaciones que exijan las reglas del curso.       |
| Materia previa requerida                  | Cumplir los prerrequisitos del curso.                                         |
| Matrícula inactiva / materia no publicada | Contactar con administración. No se reactiva desde este flujo.                |

Un día autorizado equivale a 24 horas desde la confirmación. Renovar aquí crea un
período nuevo desde ese momento, no añade días al vencimiento anterior. Se conserva
el historial. Los porcentajes cuentan lecciones publicadas completadas, no notas
ni certificación de aprobación.

## API añadida

Rutas privadas bajo `/api/v1/academic`:

| Ruta                                                   | Uso                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET /offerings`                                       | Oferta publicada con solicitud/matrícula del estudiante actual.         |
| `POST /registration-requests`                          | `{ courseId }`; solicita inscripción propia.                            |
| `GET /registration-requests`                           | Administración: solicitudes con búsqueda y paginación.                  |
| `POST /registration-requests/:id/review`               | `{ decision: aprobar o rechazar, reason }`.                             |
| `GET /enrollments/:id`                                 | Administración: módulos e historial (últimas 100 autorizaciones).       |
| `POST /enrollments/:id/access`                         | `{ operationId, moduleIds, days, reason }`; autorización institucional. |
| `POST /enrollments/:id/access/:grantId/revoke`         | `{ reason }`; revocación institucional con auditoría.                   |
| `GET /classroom/:courseId`                             | Temario, disponibilidad y progreso del alumno autenticado.              |
| `GET /classroom/:courseId/lessons/:lessonId`           | Contenido solo con acceso efectivo.                                     |
| `POST /classroom/:courseId/lessons/:lessonId/complete` | Avance del alumno actual, sin aceptar notas ni tiempos vistos.          |

Los listados de oferta y solicitudes admiten los parámetros paginados existentes
`q`, `cursor` y `limit`. Las escrituras exigen origen válido, sesión y autorización
en NestJS. Next.js solo expone rutas concretas del puente. Las consultas privadas
usan `no-store`; el contenido entregado antes de una revocación no puede borrarse
retroactivamente del navegador de quien ya lo recibió.

## Comprobaciones manuales pendientes

- Un estudiante no puede aprobar solicitudes, autorizar módulos ni consultar otra matrícula.
- Un docente no puede conceder acceso administrativo.
- Una cuenta pendiente o suspendida no puede estudiar ni solicitar inscripciones.
- Reenviar una solicitud no crea duplicados.
- Reintentar la misma autorización no duplica períodos; otros datos con el mismo ID se rechazan.
- Un módulo de otra materia no se puede incluir en la autorización.
- Un alumno sin cobertura, con matrícula inactiva o plazo vencido no obtiene contenido ni registra avance.
- Completar la misma lección varias veces no duplica progreso ni evento de finalización.
- Un módulo posterior respeta los requisitos anteriores, aunque tenga cobertura.
- Tras cerrar sesión las rutas privadas requieren autenticación.

Después de tus pruebas funcionales, los comandos de comprobación técnica disponibles
siguen siendo `pnpm.cmd lint`, `pnpm.cmd typecheck`, `pnpm.cmd test`,
`pnpm.cmd test:e2e` y `pnpm.cmd build`. Las pruebas automatizadas existentes todavía
no incorporan casos específicos para todos los endpoints nuevos de esta entrega.

## Límites de esta entrega

El aula incorpora texto escapado, enlaces HTTPS y avance declarado. No incluye
reproductor de video privado, archivos protegidos, envío de tareas, evaluación,
notas, pagos, certificados, editor completo de contenido ni reactivación de matrícula.
La autorización institucional no simula una compra. El siguiente paso funcional es
la gestión docente de contenido y evaluaciones, seguido de los recursos privados.

Decisión: [ADR 0007](adr/0007-enrollment-classroom.md).
