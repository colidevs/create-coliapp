# {{name}}

Next.js console app on Kumo UI (`@cloudflare/kumo`), scaffolded from `create-coliapp`'s
`nextjs-kumo-console` template — colidevs' compliant reference implementation of the Kumo-console
frontend standard (ADR 0001, 0004, 0013, 0014, 0019-0026 in the hefesto repo, mirrored under
`.claude/rules/console-*.md` and `.claude/rules/frontend-*.md`).

This is the Phase 1 (template skeleton) state: package setup, Kumo CSS wiring, root layout, CI/Husky,
and code-generated icons. Auth/tenant wiring, the `orders` CRUD module, and cross-cutting concerns
(CSP, Storybook, Playwright, Lighthouse) land in later phases of the `kumo-console-template` change.

## Local development

```bash
pnpm install
pnpm dev
```

## Stack

- Next.js 16 (App Router), React 19, TypeScript.
- `@cloudflare/kumo` — pinned exact per hefesto's `console-ui-kumo.md` (never `^`/`~`) — with Tailwind
  CSS v4 wired in `src/app/globals.css` in the exact `@source` / `@import` order that rule requires.
- Biome only — no ESLint, no Prettier.
- `data-mode="light"` is set statically on `<html>` for now; theme-switching is not yet implemented.

## Icons

`src/app/icon.tsx` / `src/app/apple-icon.tsx` use Next.js's code-generated icon convention
(`ImageResponse` from `next/og`) instead of a static `.svg`/`.png`. This template ships no binary
assets at all, sidestepping a `create-coliapp` scaffolder bug where `replaceName()` reads/writes every
file as UTF-8 unconditionally and corrupts binary files.

## CI / local checks

`.github/workflows/frontend-standard.yml` (copied into every project scaffolded from this template)
runs Biome + typecheck + build on every PR. `.husky/pre-commit` runs the same lint/typecheck pass
locally before each commit.
