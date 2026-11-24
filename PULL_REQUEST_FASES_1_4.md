# Pull request preparado: fases 1–4

Destino: `main`. Origen: `feat/ux-performance-calendar-assistant`.

## Título

Consolidar demostración local: rendimiento, navegación, agenda y ayuda por perfil

## Descripción propuesta

La demostración local reunía cambios sin consolidar y requería recorridos más claros por perfil. Esta rama incorpora la implementación existente y las cuatro fases: consultas académicas optimizadas con mediciones, navegación desplegable, prioridades administrativas/docentes, agenda ampliada y Asistente E-SAPIENS con FAQ local. Conserva sesiones, permisos, exportaciones y las relaciones académicas de la base de demostración.

- Rendimiento: lecturas docentes en paralelo; menos consultas para curso/módulos, evaluaciones y Centro de Datos. Medición y límites en `FASE_1_ESTABILIZACION.md`.
- Navegación: barra expandida/compacta con preferencia persistente, grupos independientes y menú móvil existente; prioridades docentes y formularios con errores y confirmación.
- Agenda: mes, semana y próximos eventos; filtros, detalles y enlaces autorizados; Nager.Date v4 para feriados nacionales informativos de Bolivia con timeout/caché/fallo independiente; descarga iCalendar.
- Ayuda: 24 FAQ verificadas, sugerencias por rol/página, búsqueda tolerante, conversación temporal y enlaces permitidos. Carga al abrir, sin IA externa, peticiones de conversación ni operaciones académicas.
- Operación: README, diagrama y guía final de demostración actualizados; Node 24.21.0 y pnpm 10.34.5. No incluye configuración privada, credenciales ni evidencias temporales.

### Relación con el PR #15

Esta propuesta **incorpora y consolida las funciones del PR #15**, que continúa abierto. No es un cambio independiente para fusionar a ciegas después de aquel. Comparación sobre `2f0b982`: de sus 41 archivos, 25 eran idénticos y 14 estaban presentes con ampliaciones; los dos ausentes eran informes históricos. Todas sus funciones están conservadas, incluido un único Centro de Datos con seis vistas.

El responsable debe acordar cuál propuesta incorporar y cómo cerrar la otra. Esta tarea no cerró ni modificó el PR #15. `main` fue verificado en `d0cb345` al preparar esta entrega; no se ejecutaron pull, rebase, merge ni actualizaciones forzadas.

### Validación

Resultados finales y alcance verificable en `FASE_4_ASISTENTE_CIERRE.md`. Incluye tipos, lint, compilación completa, pruebas unitarias, seis suites E2E con rollback y verificaciones HTTP por rol de portales, agenda y exportaciones. Las pruebas de ayuda se conservan en `apps/web/test/help-assistant.test.cjs` y se ejecutan con `pnpm --dir apps/web test`.

### Límites

No hubo navegador conectado para revisión visual/interactiva real; las pruebas controladas de manejadores/SSR/CSS no la sustituyen. Las mediciones de rendimiento son locales y no equivalen a una prueba de carga. Los feriados dependen de la información del proveedor y no reprograman actividades. No se certifica un despliegue de producción.

## Estado de publicación

**Preparado localmente; no publicado.** La rama permanece local. La integración del repositorio produjo un preview Vercel real para el PR #15; un push/PR nuevo puede activar otro. Se conserva la instrucción previa de no desplegar en Vercel, por lo que no se publica la rama ni se modifica esa integración sin autorización específica. También queda señalado el solapamiento con el PR #15 antes de cualquier publicación.

No existe URL de un PR nuevo. Este archivo contiene el título y cuerpo revisables; su publicación y cualquier preview externo quedan pendientes. No se hizo push, merge, cierre de PR ajeno ni despliegue desde esta tarea.
