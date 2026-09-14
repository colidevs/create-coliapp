#!/usr/bin/env node
/**
 * @description Mirrors `scripts/generate-openapi.ts`'s own `--check` mode
 * (ADR 0040's 2026-08-31 addendum: "generate-and-diff verification is
 * mandatory, not implied"), applied to Drizzle migrations instead of the
 * generated OpenAPI spec. `pnpm db:generate` (`drizzle-kit generate`) is
 * DB-less — it diffs `src/lib/db/schema.ts` against the last recorded
 * snapshot in `drizzle/meta/*.json` and regenerates `drizzle/`; this script
 * fails the build the moment that regeneration produces a diff against what
 * is actually committed, meaning `schema.ts` changed without a matching
 * migration being generated and committed alongside it.
 *
 * Threat-model note (mirrors `scripts/api-standard-gate.mjs`'s own Threat
 * Matrix, "Git repository selection" row): `cwd` is fixed to this script's
 * own directory's parent (`apps/api`, derived from `import.meta.url`), never
 * `process.cwd()` — Turborepo may invoke this script from the monorepo
 * root, and a `cwd`-relative `git status -- drizzle/` run from the wrong
 * directory would silently check the wrong path or fail to resolve
 * `drizzle/` at all. The `--` before the pathspec is literal, never
 * interpolated — this script accepts no external input that could be
 * mistaken for a `git` flag.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");

function run(command, args, options = {}) {
	return spawnSync(command, args, {
		cwd: apiRoot,
		encoding: "utf8",
		...options,
	});
}

function main() {
	const generate = run("pnpm", ["exec", "drizzle-kit", "generate"]);

	if (generate.status !== 0) {
		console.error("db:generate:check — `drizzle-kit generate` failed:");
		console.error(generate.stdout);
		console.error(generate.stderr);
		process.exitCode = 1;
		return;
	}

	const status = run("git", ["status", "--porcelain", "--", "drizzle/"]);

	if (status.status !== 0) {
		console.error("db:generate:check — `git status` failed:");
		console.error(status.stderr);
		process.exitCode = 1;
		return;
	}

	const dirty = status.stdout.trim();

	if (dirty.length > 0) {
		console.error(
			"db:generate:check — drizzle/ is stale: regenerating migrations from " +
				"the current src/lib/db/schema.ts produced an uncommitted diff:\n" +
				`${dirty}\n` +
				"Run `pnpm db:generate` and commit the result under drizzle/.",
		);
		process.exitCode = 1;
		return;
	}

	console.log("drizzle/ is up to date.");
}

main();
