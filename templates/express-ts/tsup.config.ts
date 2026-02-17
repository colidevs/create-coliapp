import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
	entry: ["src/**/*"],
	clean: true,
	publicDir: true,
	format: ["cjs"],
	...options,
}));
