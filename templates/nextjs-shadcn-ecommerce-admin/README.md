# {{name}}

> **Under construction.** This template is being built across a stacked PR series
> (`sdd/ecommerce-admin-template`, hefesto). This PR ships the root monorepo
> scaffold only — `apps/api` and `apps/web` are placeholder workspace members
> with no real code yet. Do not scaffold real projects from this template
> until the full series has merged.

## Layout

ADR 0029 monorepo (`pnpm-workspace.yaml` + Turborepo):

- `apps/api` — Express/TypeScript backend (colidevs' `express-ts` conventions
  + a dLocal checkout/webhook integration + a catalog/stock/orders domain).
- `apps/web` — Next.js/shadcn storefront + admin console.

## Development

```bash
pnpm install
pnpm build
pnpm dev
```

Root scripts run through Turborepo's task graph (`turbo run <task>`) — apps
are never invoked directly. See `turbo.json` for the full task list.

## Licensing

Two LICENSE files, one per app: `apps/api/LICENSE` (Apache-2.0) and
`apps/web/LICENSE` (MIT). No single root LICENSE — see this template's own
design record (`sdd/ecommerce-admin-template/design`, decision A7) for why.

## Client-name substitution

Full client-name substitution instructions land in a later PR of this series
(task 8.3) once `apps/api` and `apps/web` are built out. For now, the only
substitution point wired is this file's own `{{name}}` heading, replaced by
`create-coliapp`'s scaffolder at project-creation time.
