import {defineConfig} from "tsup";
import {cp} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export default defineConfig({
  entry: ["index.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  outDir: "dist",

  async onSuccess() {
    // Exclude each template's own node_modules/dist/lockfile — these are
    // per-template dev artifacts, never meant to ship inside the published
    // CLI package. Copying them verbatim also breaks on pnpm's symlinked
    // .pnpm store (ERR_FS_CP_EINVAL: a package ends up copied into a
    // subdirectory of itself) whenever a template has been `pnpm install`ed
    // locally before running this build.
    const EXCLUDED_DIR_NAMES = new Set([
      "node_modules",
      "dist",
      ".turbo",
    ]);

    await cp(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "templates"),
      path.join("dist", "templates"),
      {
        recursive: true,
        filter: (source) => !EXCLUDED_DIR_NAMES.has(path.basename(source)),
      },
    );
  },
});
