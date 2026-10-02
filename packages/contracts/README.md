# @esapiens/contracts

Paquete privado con contratos TypeScript de transporte compartidos entre NestJS y Next.js. Su punto de entrada es `index.d.ts`; no tiene JavaScript ni dependencias de runtime.

```ts
import type { PublicCourseDetail, PublicPage } from "@esapiens/contracts";
```

Contiene cursos, temarios, fichas bibliográficas y paginación pública. No contiene entidades PostgreSQL, reglas de autorización ni información privada. Los tipos no validan JSON en tiempo de ejecución: la API valida entradas con DTOs y la web valida las respuestas en `features/*/api.ts`.

El contrato externo está documentado en OpenAPI por los controladores de NestJS. Al cambiar una respuesta, actualizar conjuntamente estos tipos, su esquema OpenAPI, la validación de la web y las pruebas de integración. La generación automática desde OpenAPI se evaluará cuando aumente el contrato.
