#!/usr/bin/env node

import path from "node:path";
import {fileURLToPath} from "node:url";
import prompts from "prompts";
import fs from "fs-extra";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import * as handlebars from "handlebars";
const $ = console.log;

const TEMPLATES: prompts.Choice[] = [
  {
    title: "nextjs > eslint > typescript > shadcn/ui",
    description: "Most popular template in colidevs",
    value: "nextjs-eslint-ts-shadcn",
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

  // replace {{name}} on package.json, README.md, src/app/layout.tsx
  replaceName(destination, answer.name);

  projectCreatedSuccessfully(answer.name);
}

main().catch(console.error);

function replaceName(destination: string, projectName: string) {
  const packageJsonPath = path.join(destination, "package.json");
  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContent);
  packageJson.name = projectName;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const readmePath = path.join(destination, "README.md");
  const readmeContent = fs.readFileSync(readmePath, "utf-8");
  const readmeTemplate = handlebars.compile(readmeContent);
  const readme = readmeTemplate({name: projectName});
  fs.writeFileSync(readmePath, readme);

  const layoutPath = path.join(destination, "src/app/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  const layoutTemplate = handlebars.compile(layoutContent);
  const layout = layoutTemplate({name: projectName});
  fs.writeFileSync(layoutPath, layout);
}

function cpyTemplate(templateDir: string, destination: string) {
  fs.ensureDirSync(destination);
  fs.copySync(templateDir, destination);
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
