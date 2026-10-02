# Web E-SAPIENS

Next.js App Router + React + TypeScript. Las páginas públicas usan Server Components para consultar NestJS. Los componentes cliente se limitan a interacción como navegación adaptable y recuperación de errores.

## Desarrollo

Crear `apps/web/.env.local` desde `.env.example` si todavía no existe. `API_URL=http://localhost:4000` es una variable del servidor; no lleva prefijo `NEXT_PUBLIC_`.

Desde la raíz:

```powershell
pnpm.cmd dev
pnpm.cmd --filter esapiens-web lint
pnpm.cmd --filter esapiens-web typecheck
pnpm.cmd --filter esapiens-web build
```

## Rutas

| Ruta               | Función                                             |
| ------------------ | --------------------------------------------------- |
| `/`                | Presentación institucional y accesos                |
| `/cursos`          | Catálogo público, búsqueda y paginación             |
| `/cursos/[slug]`   | Ficha, objetivos y temario publicado                |
| `/biblioteca`      | Búsqueda de fichas bibliográficas públicas          |
| `/biblioteca/[id]` | Autoría, referencia y temas                         |
| `/login`           | Información sobre la futura habilitación de cuentas |

`features/catalog` y `features/library` validan las respuestas antes de renderizar. `shared/api/public-api.ts` impone un timeout y distingue respuestas inválidas, indisponibilidad y recursos inexistentes. No hay acceso a `pg`, SQL ni credenciales de base de datos en la web.

Las listas conservan `q` en la URL y usan `cursor` para avanzar. Una búsqueda sin coincidencias presenta un estado vacío; una caída de la API presenta un error recuperable. Los detalles inexistentes muestran la página 404.

Para mantener visible una retirada de publicación, estas lecturas usan `cache: "no-store"`. La caché pública requerirá una política de invalidación explícita antes de incorporarse. Véase [ADR 0004](../../docs/adr/0004-public-catalog.md).

La adaptación a pantallas pequeñas forma parte de la web. No se está desarrollando una aplicación móvil independiente.

## Sistema visual

La interfaz usa tema claro institucional por defecto y tema oscuro seleccionable. Colores semánticos, tipografía Geist y componentes compartidos se describen en [el sistema visual](../../docs/12-visual-system.md). Usar esos tokens para las próximas pantallas. La portada presenta los accesos disponibles; el estado técnico de los servicios se consulta mediante la API de salud.
