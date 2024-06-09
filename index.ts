#!/usr/bin/env node

import {program} from "commander";
import prompts from "prompts";
import fs from "fs-extra";
import path from "path";
import {fileURLToPath} from "url";
import * as handlebars from "handlebars";
const $ = console.log;

const TEMPLATES: prompts.Choice[] = [
  {
    title: "nextjs > eslint > typescript > shadcn/ui",
    description: "Most popular template in colidevs",
    value: "nextjs-eslint-ts-shadcn",
  },
];

program
  .version("1.0.0")
  .description("Colidevs CLI 🚀")
  .option("-n, --name <name>", "Your name")
  .action(async (cmd) => {
    const answer = await prompts(
      [
        {
          type: "text",
          name: "name",
          message: "What is your project name? 🚀",
          initial: cmd.name || "my-coliapp",
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

    fs.ensureDirSync(destination);
    fs.copySync(templateDir, destination);

    // replace {{name}} on package.json, README.md, src/app/layout.tsx
    const packageJsonPath = path.join(destination, "package.json");
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    packageJson.name = answer.name;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    const readmePath = path.join(destination, "README.md");
    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    const readmeTemplate = handlebars.compile(readmeContent);
    const readme = readmeTemplate({name: answer.name});
    fs.writeFileSync(readmePath, readme);

    const layoutPath = path.join(destination, "src/app/layout.tsx");
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");
    const layoutTemplate = handlebars.compile(layoutContent);
    const layout = layoutTemplate({name: answer.name});
    fs.writeFileSync(layoutPath, layout);

    $("\nProject created successfully 🚀🚀");

    $("--------------------------------------------------");
    $("👉", "cd", answer.name);
    $("--------------------------------------------------");
    $("Install dependencies:");
    $("👉", "pnpm install");
    $("--------------------------------------------------");
    $("Run dev server:");
    $("👉", "pnpm dev\n");
  });

program.parse(process.argv);
