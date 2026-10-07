# Optimización y experiencia profesional

Entrega: 06/10/2026. Revisión manual del código y los diffs únicamente. Por
indicación del propietario no se ejecutaron pruebas, navegador, servidor, lint,
typecheck, build, instalación ni migraciones. No hay mediciones de rendimiento
ni validación en ejecución de esta entrega.

## Experiencia

- `shared/ui/institutional-carousel.tsx` centraliza misión, visión y compromiso,
  con textos editables en `slides`. Se utiliza en la portada pública y en los
  inicios de administración, docencia y estudiante; conserva las interacciones.
  Cambia cada 5 segundos, permite avance manual y pausa, se detiene con foco,
  cursor encima o pestaña oculta y respeta la preferencia de movimiento reducido.
  Las diapositivas comparten altura para evitar saltos de contenido.
- `features/portal/agenda-calendar.tsx` centraliza el gesto horizontal, los
  controles y la navegación por teclado. Las listas de agenda se desplazan;
  los avisos internos corresponden solo a próximos pendientes, según
  [la documentación del calendario](20-calendar-and-local-start.md).
- El menú móvil cierra al pasar a escritorio, conserva el foco visible y evita
  desplazar el fondo cuando está abierto. Controles deshabilitados y textos largos
  tienen estilos comunes. El día seleccionado conserva contraste en tema oscuro.
- Cursos y biblioteca incluyen título y descripción propios para buscadores.
  La ficha de curso enlaza a la solicitud de inscripción ya existente.

## Rendimiento y organización

- Informes y cárdex del estudiante se consultan en paralelo cuando son independientes.
- La búsqueda de materias cancela consultas sustituidas o desmontadas, tiene un
  tiempo límite y conserva la búsqueda original al paginar aunque se edite el campo.
- `React.cache` comparte la lectura del detalle público entre metadatos y página
  dentro de una misma petición. No crea una caché persistente de datos privados.
- Los conteos del calendario se indexan por fecha con `Map`; la consulta de clases
  se limita al mes mostrado, porque ya no participan en los avisos.
- Se elimina la duplicación del tratamiento de cuerpos HTTP de los dos proxies
  mediante `shared/api/proxy-request.ts`, con límites propios para cada ruta.
- Se retiraron cinco SVG de la plantilla Next.js y el consumidor web de salud,
  sin referencias en la aplicación. Los endpoints de salud de NestJS se conservan.
- Se mantienen monorepo, módulos por dominio, contratos compartidos y NestJS como
  autoridad de negocio. No se añadieron paquetes, tablas ni servicios.

## Seguridad y resiliencia

- Los proxies validan origen, tipo JSON exacto, objeto JSON y bytes reales del
  cuerpo, además del tamaño declarado. Conservan límites de 8/64/96 KiB según
  endpoint, cookies de sesión, autorización en NestJS y política `no-store`.
- Las rutas de revisión de cuentas requieren un UUID con estructura completa.
  Los errores de avatar tampoco se cachean. Las lecturas públicas rechazan
  redirecciones del servidor de API.
- La web desactiva `X-Powered-By`, añade restricciones de permisos del navegador,
  cabeceras de no indexación para rutas privadas y HSTS solo en compilaciones de
  producción configuradas con `APP_URL` HTTPS.
- La CSP limita `base-uri`, `object-src`, `frame-ancestors` y `form-action`.
  Es una política acotada, no una CSP estricta de scripts: el streaming de Next.js
  y el script inicial del tema conservan su comportamiento. Una política de
  scripts con nonce requiere una revisión específica de renderizado y despliegue.
  Referencias: [cabeceras de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
  y [directivas CSP de MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
- NestJS rechaza valores desconocidos en validación y no adjunta `target` ni
  `value` a sus errores. Los errores HTTP llevan `no-store`; cuerpos demasiado
  grandes o con codificación no admitida devuelven 413/415 con mensajes seguros.
- `X-Request-Id` queda limitado a 128 caracteres de un conjunto explícito.
- PostgreSQL maneja errores de conexiones ociosas y de clientes en transacción;
  un rollback fallido descarta la conexión sin sustituir el error original.
  Las transacciones inactivas tienen
  un límite de 10 segundos, junto a los límites de consulta existentes.

La revisión de TSX siguió `vercel:react-best-practices` para efectos, limpieza de
recursos, límites cliente/servidor y accesibilidad. Los cambios no constituyen una
auditoría completa de seguridad ni una certificación de preparación para producción.
La copia anidada `E-SAPIENS/` y los cambios previos del propietario se conservaron.
