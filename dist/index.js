#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/tsup@8.1.0_typescript@5.4.5/node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl = () => typeof document === "undefined" ? new URL("file:" + __filename).href : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();

// index.ts
var import_commander = require("commander");
var import_prompts = __toESM(require("prompts"));
var import_fs_extra = __toESM(require("fs-extra"));
var import_path = __toESM(require("path"));
var import_url = require("url");
var handlebars = __toESM(require("handlebars"));
var $ = console.log;
var TEMPLATES = [
  {
    title: "nextjs > eslint > typescript > shadcn/ui",
    description: "Most popular template in colidevs",
    value: "nextjs-eslint-ts-shadcn"
  }
];
import_commander.program.version("1.0.4").description("Colidevs CLI \u{1F680}").option("-n, --name <name>", "Your name").action(async (cmd) => {
  const answer = await (0, import_prompts.default)(
    [
      {
        type: "text",
        name: "name",
        message: "What is your project name? \u{1F680}",
        initial: cmd.name || "my-coliapp"
      },
      {
        type: "select",
        name: "template",
        message: "Select a project template \u{1FA90}",
        choices: TEMPLATES
      }
    ],
    {
      onCancel: () => {
        $(`\u270C\uFE0F\u270C\uFE0F`);
        process.exit(0);
      }
    }
  );
  const templateDir = import_path.default.join(
    import_path.default.dirname((0, import_url.fileURLToPath)(importMetaUrl)),
    "templates",
    answer.template
  );
  const destination = import_path.default.join(process.cwd(), answer.name);
  import_fs_extra.default.ensureDirSync(destination);
  import_fs_extra.default.copySync(templateDir, destination);
  const packageJsonPath = import_path.default.join(destination, "package.json");
  const packageJsonContent = import_fs_extra.default.readFileSync(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContent);
  packageJson.name = answer.name;
  import_fs_extra.default.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  const readmePath = import_path.default.join(destination, "README.md");
  const readmeContent = import_fs_extra.default.readFileSync(readmePath, "utf-8");
  const readmeTemplate = handlebars.compile(readmeContent);
  const readme = readmeTemplate({ name: answer.name });
  import_fs_extra.default.writeFileSync(readmePath, readme);
  const layoutPath = import_path.default.join(destination, "src/app/layout.tsx");
  const layoutContent = import_fs_extra.default.readFileSync(layoutPath, "utf-8");
  const layoutTemplate = handlebars.compile(layoutContent);
  const layout = layoutTemplate({ name: answer.name });
  import_fs_extra.default.writeFileSync(layoutPath, layout);
  $("\nProject created successfully \u{1F680}\u{1F680}");
  $("--------------------------------------------------");
  $("\u{1F449}", "cd", answer.name);
  $("--------------------------------------------------");
  $("Install dependencies:");
  $("\u{1F449}", "pnpm install");
  $("--------------------------------------------------");
  $("Run dev server:");
  $("\u{1F449}", "pnpm dev\n");
});
import_commander.program.parse(process.argv);
//# sourceMappingURL=index.js.map