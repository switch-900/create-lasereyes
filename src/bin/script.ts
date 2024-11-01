#!/usr/bin/env node
/** @format */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import { fileURLToPath } from "url";
import { dirname } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Utility function to execute shell commands with async/await
async function executeCommand(
    command: string,
    args: string[],
    options = {}
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(command, args, { stdio: "inherit", ...options });
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

// Utility function for delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the type for argv
interface Argv {
  projectName: string;
  language: string;
  installTailwind: boolean;
  installShadcn: boolean;
  _: (string | number)[];
  $0: string;
}

// Parse the arguments and use type assertion
const argv = yargs(hideBin(process.argv))
    .option('projectName', {
      type: 'string',
      description: 'Name of your project',
      default: 'lasereyes-app',
    })
    .option('language', {
      type: 'string',
      choices: ['JavaScript', 'TypeScript'],
      description: 'Language for the project',
      default: 'TypeScript',
    })
    .option('installTailwind', {
      type: 'boolean',
      description: 'Install Tailwind CSS',
      default: true,
    })
    .option('installShadcn', {
      type: 'boolean',
      description: 'Install Shadcn for UI components',
    })
    .argv as Argv; // Type assertion here

async function copyTemplateFiles(projectPath: string) {
  try {
    const sourceDir = path.join(__dirname, "..", "..", "src", "templates", "next");
    const targetDir = path.join(projectPath, "app");
    const componentsDir = path.join(projectPath, "components");
    const uiDir = path.join(componentsDir, "ui");

    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.mkdir(componentsDir, { recursive: true });
    await fs.promises.mkdir(uiDir, { recursive: true });

    const fileMap = [
      {
        source: "app/page.txt",
        target: path.join(projectPath, "app", "page.tsx"),
      },
      {
        source: "app/layout.txt",
        target: path.join(projectPath, "app", "layout.tsx"),
      },
      {
        source: "components/DefaultLayout.txt",
        target: path.join(projectPath, "components", "DefaultLayout.tsx"),
      },
      {
        source: "components/ConnectWallet.txt",
        target: path.join(projectPath, "components", "ConnectWallet.tsx"),
      },
    ];

    for (const file of fileMap) {
      const sourcePath = path.join(sourceDir, file.source);
      const content = await fs.promises.readFile(sourcePath, "utf8");
      await fs.promises.writeFile(file.target, content, "utf8");
      console.log(`✅ Copied ${path.basename(file.target)} successfully`);
    }
  } catch (error) {
    console.error("Error copying template files:", error);
  }
}

async function installLaserEyes(projectPath: string) {
  console.log("Installing @omnisat/lasereyes...");
  await executeCommand("npm", ["install", "@omnisat/lasereyes", "--no-audit"], {
    cwd: projectPath,
  });
  console.log("✨ @omnisat/lasereyes installed successfully!");
}

async function installShadcnFn(projectPath: string) {
  console.log("Initializing Shadcn...");
  await executeCommand("npx", ["shadcn@latest", "init", "-d"], {
    cwd: projectPath,
  });
  console.log("Shadcn initialized successfully!");

  await delay(1000);

  console.log("Adding button component...");
  await executeCommand("npx", ["shadcn@latest", "add", "button"], {
    cwd: projectPath,
  });
  console.log("✨ Shadcn button component installed successfully!");
}

async function run() {
  try {
    let { projectName, language, installTailwind, installShadcn } = argv;

    if (!projectName || !language || typeof installTailwind !== "boolean") {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "What is the name of your project?",
          default: projectName,
        },
        {
          type: "list",
          name: "language",
          message: "Which language would you like to use?",
          choices: ["JavaScript", "TypeScript"],
          default: language,
        },
        {
          type: "confirm",
          name: "installTailwind",
          message: "Would you like to install Tailwind CSS?",
          default: installTailwind,
        },
      ]);

      projectName = answers.projectName;
      language = answers.language;
      installTailwind = answers.installTailwind;
    }

    console.log(`Running create-next-app for project: ${projectName}...`);
    const createNextAppArgs = [
      "create-next-app@14.2.3",
      projectName,
      "--typescript",
      "--tailwind",
      "--eslint",
      "--app",
      "--import-alias=@/*",
      "--no-git",
      "--use-npm",
      "--yes",
    ];

    await executeCommand("npx", createNextAppArgs);
    console.log("Next.js project created successfully!");

    const projectPath = path.join(process.cwd(), projectName);
    await copyTemplateFiles(projectPath);

    await installLaserEyes(projectPath);

    const readmeContent = `# ${projectName}\n\nBuilt with ${language}${
        installTailwind ? "\nTailwind: Enabled" : ""
    }\nIncludes @omnisat/lasereyes`;
    await fs.promises.writeFile(
        path.join(projectPath, "README.md"),
        readmeContent
    );
    console.log("README updated with custom content!");

    if (installTailwind) {
      if (!installShadcn) {
        const shadcnAnswer = await inquirer.prompt([
          {
            type: "confirm",
            name: "installShadcn",
            message: "Would you like to install Shadcn for UI components?",
            default: true,
          },
        ]);
        installShadcn = shadcnAnswer.installShadcn;
      }

      if (installShadcn) {
        await installShadcnFn(projectPath);
      }
    }

    console.log(`✨ Success! Created ${projectName} at ${projectPath}`);
    console.log("\nHappy Building! 🤝");
    console.log(projectName);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();
