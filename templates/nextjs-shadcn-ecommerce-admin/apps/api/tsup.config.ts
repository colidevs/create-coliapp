import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
	// Excludes test files: `src/**/*` previously matched `*.test.ts` too,
	// bundling a full copy of vitest's runtime into `dist/**/*.test.cjs` on
	// every `pnpm build` (confirmed while adding Phase 3 tests — some of
	// those bundles reached 1+ MB each). Worse, `vitest.config.ts` doesn't
	// exclude `dist/`, so Vitest's default `**/*.test.?(c|m)[jt]s?(x)`
	// glob picked up those compiled duplicates too, causing flaky/crashing
	// double test collection (`Cannot read properties of undefined
	// (reading 'config')`) whenever `dist/` existed from a prior build.
	entry: ["src/**/*", "!src/**/*.test.ts", "!src/**/__tests__/**"],
	clean: true,
	publicDir: true,
	format: ["cjs"],
	...options,
}));
