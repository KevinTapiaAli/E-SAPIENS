# ADR 0007 — Inscripción solicitada, acceso institucional y aula de lectura

05/10/2026. Implementación solicitada para continuar el portal y demostrar inscripción,
cobertura y avance. La validación ejecutable queda a cargo del propietario por su
instrucción expresa en esta entrega.

## Decisión

Extender el módulo académico de NestJS con servicios separados de inscripción/acceso
y aula. Next.js presenta el flujo; PostgreSQL conserva la autoridad del acceso
efectivo mediante `puede_acceder_modulo` y del avance mediante `registrar_progreso`.
No se añaden proveedores, dependencias ni servicios desplegables.

El estudiante solicita una materia publicada. La solicitud pertenece al usuario de
la sesión y no autoriza contenido. Administración aprueba/rechaza con motivo; aprobar
crea una matrícula activa o reutiliza la ya activa, dentro de la misma transacción.
No reactiva matrículas inactivas. Una solicitud por estudiante/materia evita duplicados;
una solicitud rechazada requiere contacto administrativo, no reenvío automático.
La matrícula directa por administración continúa disponible.

Administración define módulos publicados de la materia y días de acceso institucional
desde la confirmación (24 horas por día). No se presupone la duración de un plan:
el formulario propone 30 días editables antes de confirmar. El plazo nuevo empieza
ahora, no se suma a la fecha final anterior. No constituye pago ni comprobante comercial.
El acceso se conserva como nuevas filas de `accesos_modulo`, sin reemplazar períodos.
Una clave UUID de operación se asocia al payload, matrícula y actor; repetirla con
los mismos datos no duplica concesiones y con otros datos se rechaza.

Revocar requiere permiso, motivo y autor; conserva la autorización original.
Los accesos de compra quedan fuera de la revocación institucional. Otras concesiones
vigentes sobre el mismo módulo mantienen su validez.

La migración 0004 incorpora solicitudes auditadas, operaciones de autorización,
permisos y metadatos de revocación. No edita migraciones anteriores ni reemplaza
funciones de progreso o reglas de evaluación del esquema existente.

## Aula y límites

Cada estudiante consulta sus inscripciones, el temario publicado y la explicación
de bloqueo. El contenido de una lección solo se selecciona si la sesión tiene permiso
y `puede_acceder_modulo` da acceso: cuenta aprobada, matrícula activa, publicación,
cobertura temporal y requisitos anteriores. La autorización se repite al completar.
La transacción serializa matrícula, concesión/revocación y progreso del mismo alumno.

El texto se representa escapado por React, sin ejecutar HTML. Los enlaces externos
solo se activan como URL HTTPS explícitas. No se entregan claves de almacenamiento
ni archivos privados. Lecturas/actividades/enlaces con texto permiten declarar avance;
no se aceptan notas, tiempo visto ni una identidad de alumno del navegador. Repetir
una finalización conserva el primer completado y no duplica su evento de historial.
Video y recursos protegidos todavía requieren integración específica.

El seed de aula es opcional y exclusivo de local/test: completa texto vacío de las
cinco lecciones demo identificadas y crea reglas de avance por lectura solo si no
hay reglas previas. No cambia cursos reales, no sustituye texto existente y no
crea cuentas ni autorizaciones. Las reglas reales de evaluación no se omiten para
facilitar la demostración.

## Validación pendiente

Por solicitud del propietario no se ejecutaron pruebas, lint, typecheck, build,
migraciones ni navegador en esta entrega. No reutilizar los resultados del 04/10
como evidencia de esta funcionalidad. El recorrido y casos negativos están en
[la guía del aula](../16-enrollment-classroom.md).
