#!/usr/bin/env node

import path from "node:path";
import {fileURLToPath} from "node:url";
import {readFile, rename, writeFile} from "node:fs/promises";
import prompts from "prompts";
import fs from "fs-extra";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {glob} from "glob";
const $ = console.log;

const TEMPLATES: prompts.Choice[] = [
  {
    title: "nextjs 15 > biome > shadcn/ui",
    description: "Bienvenido a Next.JS 15 y React 19, app renovada de colidevs",
    value: "nextjs15-biome-shadcn",
  },
  {
    title: "nextjs 16 > biome > kumo ui",
    description:
      "Consola admin multitenant sobre Kumo UI (Cloudflare), con auth/tenant, un módulo orders end-to-end, CSP, Storybook y Playwright ya wireados.",
    value: "nextjs-kumo-console",
  },
  {
    title: "nextjs > eslint > typescript > shadcn/ui",
    description: "Basico, usado principalmente para practicar.",
    value: "nextjs-eslint-ts-shadcn",
  },
  {
    title: "nextjs > eslint > typescript > shadcn/ui > google sheet",
    description: "Viene preparado para que uses un google sheet como db.",
    value: "nextjs-eslint-ts-shadcn-sheet",
  },
  {
    title: "react > vite > js > tailwind",
    description: "Basico, usado principalmente para practicar o crear una app client side.",
    value: "react-vite-js-tailwind",
  },
  {
    title: "express + typescript",
    description: "Proyecto backend basico con Express y TypeScript, ideal para crear APIs.",
    value: "express-ts",
  },
];

const args = yargs(hideBin(process.argv)).options({
  name: {type: "string", alias: "n", description: "Project name"},
});

prompts.override(args.argv);

async function main() {
  const cmd = await args.argv;

  const answer = await prompts(
    [
      {
        type: "text",
        name: "name",
        message: "What is your project name? 🚀",
        initial: cmd.name || "my-coliapp",
        validate: (value) => {
          if (value.match(/[^a-zA-Z0-9-_]+/g))
            return "Project name can only contain letters, numbers, dashes and underscores";

          return true;
        },
      },
      {
        type: "select",
        name: "template",
        message: "Select a project template 🪐",
        choices: TEMPLATES,
      },
    ],
    {
      onCancel: () => {
        $(`✌️✌️`);
        process.exit(0);
      },
    },
  );

  // get template folder for the selected template
  const templateDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "templates",
    answer.template,
  );

  // get the destination folder
  const destination = path.join(process.cwd(), answer.name);

  if (fs.existsSync(destination)) {
    $(`🚨🚨`, `Folder already exists: ${destination}`);

    const overwrite = await prompts({
      type: "confirm",
      name: "value",
      message: "Do you want to overwrite the folder?",
      initial: false,
    });

    if (!overwrite.value) {
      $(`✌️✌️`);
      process.exit(0);
    }

    fs.removeSync(destination);

    $(`🚨🚨`, `Folder removed: ${destination}`);

    fs.ensureDirSync(destination);

    $(`🚨🚨`, `Folder created: ${destination}`);
  }

  // copy template to destination
  cpyTemplate(templateDir, destination);

  // restore any *.npmrc.template shipped by the template back to its real
  // dotfile name (see restoreNpmrcFiles's own comment for why this exists)
  await restoreNpmrcFiles(destination);

  // replace {{name}} on package.json, README.md, src/app/layout.tsx
  await replaceName(destination, answer.name);

  projectCreatedSuccessfully(answer.name);
}

main().catch(console.error);

// Binary formats a scaffolded template could plausibly ship (icons, fonts,
// images, archives, compiled assets). Reading/rewriting these as utf8 (the
// previous unconditional behavior) corrupts them byte-for-byte, since the
// decode-reencode round-trip is lossy for non-text content. Text-based
// source files never need this exclusion, so this stays a denylist, not an
// allowlist — new template file types keep working without edits here.
const BINARY_EXTENSIONS = new Set([
  ".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".zip", ".gz", ".tar", ".pdf",
]);

async function replaceName(destination: string, projectName: string) {
  const files = await glob(`**/*`, {nodir: true, cwd: destination, absolute: true});

  for await (const file of files) {
    if (BINARY_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;

    const data = await readFile(file, "utf8");
    const draft = data.replace(/{{name}}/g, projectName);

    await writeFile(file, draft, "utf8");
  }
}

function cpyTemplate(templateDir: string, destination: string) {
  fs.ensureDirSync(destination);
  fs.copySync(templateDir, destination);
}

/**
 * `pnpm pack`/`pnpm publish` unconditionally strip any file literally named
 * `.npmrc` from a published package — verified directly against this
 * project's own real packing mechanism (`pnpm pack` on an isolated fixture
 * package): no `files` glob, no `.npmignore`, no amount of `.gitignore`
 * negation can override it (found during the `nextjs-kumo-console`
 * template's own registration, the first template in this repo to ship a
 * per-project `.npmrc` at all).
 *
 * A template needing its own `.npmrc` (e.g. a scoped registry mapping for
 * `@colidevs/*` packages, D4) must therefore ship it under a different name
 * and have it renamed back at scaffold time. `dot: true` is required here —
 * `glob`'s `**` pattern does not match dot-prefixed paths by default (the
 * same reason `replaceName`'s own glob call below can never reach `.husky/**`
 * or `.github/workflows/**`, which is why those paths must never contain a
 * `{{name}}` token in the first place).
 */
async function restoreNpmrcFiles(destination: string) {
  const files = await glob(`**/*.npmrc.template`, {
    nodir: true,
    dot: true,
    cwd: destination,
    absolute: true,
  });

  for await (const file of files) {
    await rename(file, file.replace(/\.template$/, ""));
  }
}

function projectCreatedSuccessfully(projectName: string) {
  $("\nProject created successfully 🚀🚀");

  $("--------------------------------------------------");
  $("👉", "cd", projectName);
  $("--------------------------------------------------");
  $("Install dependencies:");
  $("👉", "pnpm install");
  $("--------------------------------------------------");
  $("Run dev server:");
  $("👉", "pnpm dev\n");
}
