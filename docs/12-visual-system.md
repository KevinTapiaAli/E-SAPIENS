# Sistema visual de E-SAPIENS

Fecha: 01/10/2026. Alcance: interfaz web pública existente. La dirección prioriza legibilidad, orientación y una presencia institucional sobria. El prompt de rediseño facilitado por el propietario se utilizó como referencia de diseño.

## Dirección y paleta

Tema claro por defecto, con superficies blancas y texto azul marino. El violeta identifica acciones y sección activa; el azul petróleo acompaña información académica. Se eliminan los brillos y degradados decorativos del diseño anterior. Los mensajes de estado combinan texto e iconografía.

| Token          | Claro     | Oscuro    | Uso                              |
| -------------- | --------- | --------- | -------------------------------- |
| `canvas`       | `#F6F7FB` | `#101826` | Fondo                            |
| `surface`      | `#FFFFFF` | `#172336` | Tarjetas, cabecera y superficies |
| `surface-soft` | `#EEF1F7` | `#1E2D42` | Superficies secundarias          |
| `ink`          | `#182943` | `#ECF0F6` | Títulos y texto principal        |
| `muted`        | `#526176` | `#B5C0D0` | Descripciones y metadatos        |
| `brand`        | `#5B3FAD` | `#C0AFF5` | Acciones, enlaces y foco         |
| `on-brand`     | `#FFFFFF` | `#20163E` | Texto sobre botón principal      |
| `brand-soft`   | `#EEE9F8` | `#302647` | Etiquetas y selección            |
| `accent`       | `#216678` | `#90D0DC` | Acento académico                 |
| `input`        | `#78869D` | `#7A8DA8` | Bordes de controles              |
| `line`         | `#DCE2EC` | `#33445D` | Divisiones decorativas           |

`success`, `warning` y `danger` tienen superficie propia y se usan siempre con una explicación textual. Los colores de fuente están en `apps/web/src/app/globals.css`; `@theme inline` los expone a Tailwind (`text-ink`, `bg-surface`, etc.). No volver a introducir colores de tema literales en cada página.

## Tipografía, espacio y componentes

Geist Sans, ya disponible con `next/font`, se aplica explícitamente a `body` y a los tokens de Tailwind. Geist Mono se reserva para numeración y futuros datos técnicos. Texto general de 16 px, introducciones de 18 px y metadatos de 14 px. El título principal varía entre 36 y 52 px; los encabezados de páginas entre 30 y 36 px. Interlineado amplio, pesos 500–700 y ancho de lectura limitado.

Los componentes viven en `apps/web/src/shared/ui`, junto al sistema existente:

- `ActionLink`: acciones principal/secundaria, área mínima de 46 px.
- `Card`, `Badge`, `SectionHeading`, `StatePanel`: superficies, estados y jerarquía reutilizables.
- `CatalogSearch` y `CatalogPagination`: búsquedas con etiquetas visibles y navegación mediante enlaces.
- `SiteHeader`: sección activa con `aria-current`, menú adaptable y control de tema.
- `SiteFooter`: navegación secundaria.
- `Icon`: iconos SVG de trazo compartido, decorativos cuando acompañan un texto.
- `LearningIllustration`: ilustración SVG decorativa sin peticiones externas.

Los estilos de componentes se declaran en `@layer components` para permitir que las utilidades de Tailwind, incluidas las variantes de tamaño de pantalla, tengan precedencia. Radios de 10 px para controles y 16 px para tarjetas, separaciones basadas en la escala de Tailwind y sombras discretas.

El símbolo de libro de `BrandMark` representa el espacio educativo. Puede sustituirse por una marca oficial cuando E-SAPIENS la proporcione; no se presupone un manual corporativo existente.

## Interacción y tema

La portada prioriza cursos y biblioteca. Desde el 04/10/2026 el acceso incluye autenticación real, solicitud de cuenta y paneles iniciales de estudiante/docente/administración según [la guía de identidad](14-identity-and-workspaces.md); reutilizan la misma paleta, estados y tipografía. La portada no depende de readiness ni muestra estado técnico de infraestructura; los endpoints de salud siguen disponibles.

El botón de tema permite elegir claro u oscuro. La preferencia `esapiens-theme` se guarda localmente y se sincroniza entre pestañas. Si el navegador bloquea almacenamiento, el cambio funciona durante la visita. Un script estático inicial aplica el tema antes de pintar; `suppressHydrationWarning` se limita al elemento `html`, cuyo atributo cambia. Si se incorpora CSP, este script requerirá el hash o nonce correspondiente.

El menú móvil puede cerrarse con Escape, al seleccionar un enlace o al pulsar fuera. Escape devuelve el foco al botón. Es un menú desplegable de navegación, no un diálogo modal. Enlaces y controles conservan foco visible; el salto al contenido evita recorrer toda la cabecera.

## Accesibilidad y revisión

Objetivo de contraste para texto normal: 4,5:1; para bordes funcionales y foco: 3:1. Referencias: [contraste mínimo WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Los botones principales y de navegación tienen áreas de al menos 44 px, por encima del mínimo general de [24 px de WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Medición de los tokens: texto secundario sobre blanco 6,31:1, texto principal 14,61:1 y texto blanco en botón violeta 7,61:1. Se comprobaron 34 combinaciones en los dos temas, incluyendo estados, foco y bordes funcionales. Los valores se calculan desde los colores fuente; una auditoría completa requiere revisar cada composición final.

Los títulos de estado respetan el nivel de encabezado del contexto. Los campos conservan etiquetas visibles. Las acciones no dependen solo del color. `prefers-reduced-motion` reduce transiciones y elimina el desplazamiento suave.

La revisión visual y de teclado complementa lint, typecheck y build. Las capturas y mediciones locales quedan en `.tmp/verification/ui-*`, excluidas de Git. Estas comprobaciones básicas no certifican conformidad completa WCAG ni sustituyen pruebas con personas usuarias.

### Verificación en navegador — 02/10/2026

Se revisaron la portada, los catálogos, los detalles, el acceso pendiente y los estados de búsqueda sin coincidencias, error y página inexistente. Se comprobó la adaptación en anchos de 320, 390, 768 y 1440 px, sin desbordamiento horizontal en las vistas revisadas. Cursos y biblioteca se comprobaron también con los datos de demostración de la API local.

Se verificaron los dos temas, la persistencia de la preferencia, el menú móvil y su cierre con Escape, el foco visible y la preferencia de movimiento reducido. El enlace «Saltar al contenido» mueve el foco al elemento `main`, que utiliza `tabIndex={-1}` sin añadir una parada a la navegación secuencial. La revisión final de las rutas válidas no registró errores de aplicación en el navegador.

## Conservación funcional

Se mantienen las peticiones a NestJS, los filtros de publicación, los contratos, la búsqueda, la paginación y los temarios. No se incorporaron dependencias de interfaz, cambios de API, migraciones ni escrituras de contenido como parte de este rediseño. La aplicación móvil independiente continúa fuera de alcance.
