import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
	entry: ["src/**/*", "!src/**/*.test.ts", "!src/**/__tests__/**"],
	clean: true,
	publicDir: true,
	format: ["cjs"],
	...options,
}));
