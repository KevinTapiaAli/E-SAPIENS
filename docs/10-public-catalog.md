# Catálogo y biblioteca públicos

Primera entrega funcional, 01/10/2026. Implementación de lectura en NestJS sobre el esquema recibido; la publicación se decide en la API. No hay endpoints administrativos ni de matrícula en esta entrega.

## Endpoints

Base `/api/v1`. Swagger en `/api/docs` y contrato JSON en `/api/docs-json`.

| Método y ruta        | Respuesta                       |
| -------------------- | ------------------------------- |
| `GET /courses`       | `PublicPage<PublicCourse>`      |
| `GET /courses/:slug` | `PublicCourseDetail`            |
| `GET /library`       | `PublicPage<PublicLibraryItem>` |
| `GET /library/:id`   | `PublicLibraryDetail`           |

Los listados aceptan `q` opcional (hasta 100 caracteres después de recortar espacios), `limit` entero entre 1 y 24 (12 por defecto) y `cursor` UUID. La búsqueda es una subcadena literal, insensible a mayúsculas, sobre título y descripción. No elimina acentos ni busca en autores. `%` y `_` no son comodines. Los parámetros desconocidos se rechazan.

Se ordena por UUID ascendente, no por fecha ni relevancia. Se consulta `limit + 1` para calcular `nextCursor`; el cliente debe mantener el mismo filtro al avanzar. `nextCursor: null` indica el final. Una publicación concurrente puede cambiar el catálogo entre páginas; no se promete una instantánea de toda la navegación.

```json
{
  "items": [],
  "nextCursor": null
}
```

## Qué puede ver un visitante

- Curso: únicamente `estado='publicado'`, con categoría, título, descripción, objetivos, idioma, nivel y duración.
- Temario: únicamente módulos publicados y lecciones publicadas pertenecientes a ese curso. Se muestran títulos, tipo y duración; nunca `contenido`, archivos, enlaces de clase ni grabaciones.
- Biblioteca: únicamente `publicado=true AND ficha_publica=true`, con descripción, autoría, editorial, año, ISBN y temas/páginas.
- Las versiones y los objetos de almacenamiento permanecen fuera del contrato público, aunque una ficha sea pública.

Cada consulta selecciona campos explícitos y parámetros SQL separados. Un detalle usa un único `SELECT` para evaluar visibilidad y contenidos bajo la misma instantánea. La exposición del índice público queda documentada en [ADR 0004](adr/0004-public-catalog.md); antes de incorporar materiales reales, revisar que sus títulos y descripciones sean publicables.

## Errores

Se conserva el formato global `error: { code, message, details, requestId }`.

| Caso                                      | HTTP | Código                   |
| ----------------------------------------- | ---- | ------------------------ |
| Query inválida                            | 400  | `VALIDATION_ERROR`       |
| UUID de ficha inválido                    | 400  | `BAD_REQUEST`            |
| Curso inexistente o no publicado          | 404  | `COURSE_NOT_FOUND`       |
| Ficha inexistente, privada o no publicada | 404  | `LIBRARY_ITEM_NOT_FOUND` |
| Error inesperado de infraestructura       | 500  | `INTERNAL_SERVER_ERROR`  |

La web distingue una lista vacía de una API no disponible. Valida los datos JSON, limita la espera y no muestra errores SQL ni secretos. Las lecturas públicas no usan caché persistente, para que retirar una publicación se refleje en la siguiente consulta.

## Validación implementada

`public-catalog.e2e-spec.ts` prueba paginación sin duplicados, filtros de publicación, exclusión de lecciones ocultas, ausencia de archivos privados, entradas inválidas, búsquedas literales y errores 404. Usa PostgreSQL real dentro de una transacción reversible; no requiere datos demo. La configuración HTTP es la misma en las pruebas y en el arranque.

Los contratos TypeScript no se generan aún desde OpenAPI. Los esquemas de Swagger y los validadores de la web deben actualizarse conjuntamente con `packages/contracts`; las pruebas de forma de respuesta ayudan a detectar divergencias.

## Límites de esta entrega

No incorpora autenticación, edición de contenido, descargas, streaming, cobros ni capacidad garantizada para un número de usuarios. La búsqueda por subcadena requiere medir rendimiento cuando exista volumen real; se considerarán índices de búsqueda según los resultados, sin introducir Redis o un motor adicional por anticipado.
