# ADR 0008 — Panel ejecutivo y medición propia

07/10/2026. Se conserva Next.js → NestJS → PostgreSQL. Sin servicios ni paquetes nuevos.

El panel administrativo combina captación, solicitudes y actividad académica con
definiciones explícitas, periodo seleccionable y acciones de seguimiento. NestJS
exige `dashboard.admin` y `academic.read`; el navegador no decide métricas ni roles.

Las visitas se agregan por día UTC, identificador aleatorio de navegador y recurso.
Una cookie propia HttpOnly de 30 días permite estimar navegadores únicos; no identifica
personas y no se guardan IP, user-agent ni búsquedas. Se respeta la exclusión de
medición y las señales DNT/GPC. La retención de medición es 190 días, suficiente
para comparar ventanas de 90 días; su limpieza queda en un comando de mantenimiento.

Solo páginas visibles envían visitas; precargas y renderizado del servidor no cuentan.
El servidor valida materias publicadas y aplica límites Redis. Las conversiones
proceden de inserciones reales de cuentas/solicitudes, atribuidas al identificador
de visita cuando existe. Sin atribución se conserva la operación de negocio, pero
no se inventa conversión. Los porcentajes usan visitantes del mismo periodo y una
solicitud posterior a su primera visita, deduplicada por navegador.

La actividad semanal utiliza acciones académicas persistidas (avance, entrega y
asistencia verificada), no clics ni logins. La inactividad se mide en estudiantes
aprobados con matrícula activa y al menos 14 días sin esas acciones.

El calendario se traslada a un diálogo lateral derecho compartido. Su código y
datos se cargan al abrirlo, con navegación local de mes/día y actualización tras
guardar recordatorios; no se vuelve a consultar el dashboard al cambiar de mes.

La migración 0008 es incremental y no se ejecuta durante esta entrega. No se
inician servicios, navegador ni pruebas, conforme a la instrucción del propietario.
