import {defineConfig} from "tsup";
import {cp, rm} from "node:fs/promises";
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
    //
    // Found live 2026-08-29: a stray `.next/` build directory left over from
    // local dev/testing in `templates/nextjs-kumo-console` (gitignored,
    // never committed — but this copy step doesn't consult .gitignore)
    // inflated a real `pnpm publish` dry run to 143MB/667 files, vs. the
    // correct ~560KB/283 files a clean checkout produces. The rest of this
    // list mirrors what every Next.js-based template's own `.gitignore`
    // already excludes (`.next`, `coverage`, `out`, `.vercel`) plus
    // `nextjs-kumo-console`'s own Storybook/Playwright output dirs — the
    // same class of local build/test artifact, not a new category.
    const EXCLUDED_DIR_NAMES = new Set([
      "node_modules",
      "dist",
      ".turbo",
      ".next",
      "coverage",
      "out",
      ".vercel",
      "storybook-static",
      "test-results",
      "playwright-report",
      "blob-report",
    ]);

    const destTemplates = path.join("dist", "templates");

    // `cp()` overlays source onto destination — it never removes a
    // destination entry whose source counterpart is gone. Without this,
    // any file/directory ever copied here (a stray `.next/`, a template
    // file later deleted from `templates/`) lingers in `dist/` forever,
    // regardless of how the exclusion filter above is set. Wipe first so
    // every build produces a true mirror of current `templates/`, not an
    // accumulating overlay of every build that ever ran locally.
    await rm(destTemplates, { recursive: true, force: true });

    await cp(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "templates"),
      destTemplates,
      {
        recursive: true,
        filter: (source) => !EXCLUDED_DIR_NAMES.has(path.basename(source)),
      },
    );
  },
});
