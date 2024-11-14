#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import spawn from "cross-spawn";
import pc from "picocolors";
import prompts from "prompts";

import { type Framework, frameworks } from "./frameworks.js";
import {
  copy,
  emptyDir,
  formatTargetDir,
  isEmpty,
  isValidPackageName,
  pkgFromUserAgent,
  toValidPackageName,
} from "./utils.js";

const templates = frameworks
  .map((f) => f.variants?.map((v) => v.name) || [f.name])
  .reduce((a, b) => a.concat(b), []);

const cli = cac("create-lasereyes");

cli
  .usage(`${pc.green("<project-directory>")} [options]`)
  .option(
    "-t, --template [name]",
    `Template to use. Available: ${templates.join(", ")}`
  )
  .option("--npm", "Use npm as your package manager")
  .option("--pnpm", "Use pnpm as your package manager")
  .option("--yarn", "Use yarn as your package manager")
  .option("--tailwind", "Install TailwindCSS")
  .option("--shadcn", "Install Shadcn UI components");

function executeCommand(
  command: string,
  args: string[],
  options: any,
  silent = false
) {
  return new Promise<void>((resolve, reject) => {
    const spawnOptions = {
      ...options,
      stdio: "inherit",
      env: {
        ...process.env,
        ...options.env,
        npm_config_loglevel: "info",
        npm_config_progress: "true",
        FORCE_COLOR: "1",
      },
    };

    const child = spawn(command, args, spawnOptions);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} failed`));
        return;
      }
      resolve();
    });
  });
}

const installDependencies = async (root: string, packageManager: string) => {
  console.log("\nInstalling packages...");

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(packageManager, ["install"], {
        stdio: ["ignore", "pipe", "inherit"],
        cwd: root,
        env: {
          ...process.env,
          npm_config_loglevel: "info",
          FORCE_COLOR: "1",
        },
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject({ command: `${packageManager} install` });
          return;
        }
        resolve(true);
      });
    });

    console.log(`${pc.green("✓")} Packages installed successfully!`);
    return result;
  } catch (error) {
    console.error(`${pc.red("✖")} Failed to install packages`);
    throw error;
  }
};

// ... rest of the CLI implementation following create-wagmi's pattern
