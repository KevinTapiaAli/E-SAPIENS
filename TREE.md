# Árbol del repositorio

```text
esapiens-lms/
├─ apps/
│  ├─ web/
│  │  └─ src/{app,features,shared}/
│  ├─ api/
│  │  ├─ src/{modules,common,infrastructure}/
│  │  └─ test/
│  └─ worker/
├─ packages/
│  ├─ contracts/
│  │  └─ index.d.ts
│  ├─ ui/
│  └─ config/
├─ database/
│  ├─ migrations/
│  ├─ seeds/
│  └─ reference/
├─ docs/
│  └─ adr/
├─ .github/
│  └─ workflows/
├─ .env.example
├─ .node-version
├─ .gitignore
├─ AGENTS.md
├─ CONTRIBUTING.md
├─ PROMPT_MAESTRO.md
├─ SECURITY.md
├─ docker-compose.dev.yml
├─ package.json
├─ pnpm-workspace.yaml
├─ scripts/database.mjs
├─ tsconfig.base.json
└─ turbo.json
```

`apps/web` y `apps/api` son ejecutables. `packages/contracts` es un paquete de tipos consumido por ambos. `apps/worker`, `packages/ui` y `packages/config` conservan únicamente documentación de su intención futura. El detalle de la entrega actual está en `docs/10-public-catalog.md`.
