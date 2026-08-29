// A freshly scaffolded create-coliapp project is not a git repository yet —
// `create-coliapp`'s own CLI deliberately never runs `git init` (a scaffold
// not being git-initialized is a legitimate, common state, e.g. a dev
// reviewing the files before committing). Husky's `install()` requires an
// existing `.git` directory and fails immediately otherwise ("fatal: not a
// git repository"), which would make this template's mandated hook setup the
// first thing to fail on a fresh `pnpm install`. This guard is Node-based
// (not a shell `test -d`) so it stays portable to Windows, per Husky's own
// documented `.husky/install.mjs` skip-guard pattern
// (https://typicode.github.io/husky/how-to.html) — adapted here to gate on
// `.git` presence instead of `NODE_ENV`/`CI`, which is a different concern
// this fix does not address.
//
// Copied verbatim from `templates/nextjs-kumo-console/.husky/install.mjs`
// (`create-coliapp#32`) — same guard, same reasoning, applies identically to
// this template.
import { existsSync } from "node:fs";

if (!existsSync(".git")) {
	process.exit(0);
}

const husky = (await import("husky")).default;
console.log(husky());
