#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import spawn from "cross-spawn";
import pc from "picocolors";
import prompts from "prompts";

import { type Framework, frameworks } from "../frameworks.js";
import {
  copy,
  emptyDir,
  formatTargetDir,
  isEmpty,
  isValidPackageName,
  pkgFromUserAgent,
  toValidPackageName,
  installDependencies,
  updatePackageJson,
} from "../utils.js";

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
  .option("--tailwind", "Install TailwindCSS", { default: true })
  .option("--shadcn", "Install Shadcn UI components");

const defaultTargetDir = "lasereyes-project";

const renameFiles: Record<string, string | undefined> = {
  _gitignore: ".gitignore",
  "_env.local": ".env.local",
  _npmrc: ".npmrc",
};

async function init() {
  const { args, options } = cli.parse(process.argv);
  if (options.help) return;

  const argTargetDir = formatTargetDir(args[0]);
  const argTemplate = options.template || options.t;

  let targetDir = argTargetDir || defaultTargetDir;

  const getProjectName = () =>
    targetDir === "." ? path.basename(path.resolve()) : targetDir;

  let result: prompts.Answers<
    "framework" | "overwrite" | "projectName" | "variant" | "overwriteChecker"
  >;

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : "text",
          name: "projectName",
          message: pc.reset("Project name:"),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir;
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : "confirm",
          name: "overwrite",
          message: () =>
            `${
              targetDir === "."
                ? "Current directory"
                : `Target directory "${targetDir}"`
            } is not empty. Remove existing files and continue?`,
        },
        {
          type: (_, { overwrite }: { overwrite?: boolean }) => {
            if (overwrite === false) {
              throw new Error(`${pc.red("✖")} Operation cancelled`);
            }
            return null;
          },
          name: "overwriteChecker",
        },
        {
          type:
            argTemplate && templates.includes(argTemplate) ? null : "select",
          name: "framework",
          message:
            typeof argTemplate === "string" && !templates.includes(argTemplate)
              ? pc.reset(
                  `"${argTemplate}" isn't a valid template. Please choose from below: `
                )
              : pc.reset("Select a framework:"),
          initial: 0,
          choices: frameworks.map((framework) => {
            const frameworkColor = framework.color;
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework,
            };
          }),
        },
        {
          type: (framework: Framework) =>
            framework?.variants && framework.variants.length > 0
              ? "select"
              : null,
          name: "variant",
          message: pc.reset("Select a variant:"),
          choices: (framework: Framework) => {
            if (!framework?.variants) return [];
            return framework.variants.map((variant) => {
              const variantColor = variant.color;
              return {
                title: variantColor(variant.display || variant.name),
                value: variant.name,
              };
            });
          },
        },
      ],
      {
        onCancel: () => {
          throw new Error(`${pc.red("✖")} Operation cancelled`);
        },
      }
    );
  } catch (cancelled: any) {
    console.log(cancelled.message);
    return;
  }

  const { framework, overwrite, variant } = result;
  const root = path.join(process.cwd(), targetDir);

  if (overwrite) {
    emptyDir(root);
  }

  if (variant === "next-app") {
    console.log("\nCreating new Next.js app...");
    // Set environment variables to suppress npm output
    const env = {
      ...process.env,
      npm_config_loglevel: "error",
      npm_config_fund: "false",
      npm_config_audit: "false",
      npm_config_update_notifier: "false",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PRIVATE_SKIP_SETUP: "1",
    };

    await executeCommand(
      "npx",
      [
        "--quiet",
        "create-next-app@14.2.3",
        targetDir,
        "--typescript",
        "--tailwind",
        "--eslint",
        "--app",
        "--src-dir",
        "--import-alias",
        "@/*",
        "--no-git",
        "--use-npm",
        "--no-turbo",
        "--use-react=18",
        "--no-dependencies",
        "--quiet",
        "--skip-instructions",
      ],
      { env },
      true
    );

    const templateDir = path.resolve(
      fileURLToPath(import.meta.url),
      "..",
      "..",
      "..",
      "templates",
      variant
    );

    console.log("\nCustomizing template...");
    const filesToCopy = [
      "src/app/page.tsx",
      "src/app/layout.tsx",
      "src/components/DefaultLayout.tsx",
      "src/components/ConnectWallet.tsx",
    ];

    for (const file of filesToCopy) {
      const srcFile = path.join(templateDir, file);
      const destFile = path.join(root, file);

      try {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
          console.log(`${pc.green("✓")} Created ${file}`);
        } else {
          console.warn(`Template file not found: ${file}`);
        }
      } catch (error) {
        console.warn(`Failed to copy template file ${file}:`, error);
      }
    }

    console.log("\nInstalling @omnisat/lasereyes...");
    try {
      await executeCommand(
        "npm",
        [
          "install",
          "@omnisat/lasereyes@latest",
          "--save",
          "--no-fund",
          "--no-audit",
          "--loglevel=error",
        ],
        { cwd: root },
        true
      );
      console.log(`${pc.green("✓")} @omnisat/lasereyes installed!`);
    } catch (error) {
      console.error("Failed to install @omnisat/lasereyes:", error);
      throw error;
    }

    console.log("\nInitializing Shadcn...");
    try {
      await executeCommand(
        "npx",
        ["shadcn@latest", "init", "-d"],
        {
          cwd: root,
          env: {
            SKIP_INSTRUCTIONS: "1",
          },
        },
        true
      );
      console.log(`${pc.green("✓")} Shadcn initialized successfully!`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Add the button component
      console.log("\nAdding button component...");
      await executeCommand(
        "npx",
        ["shadcn@latest", "add", "button"],
        {
          cwd: root,
          env: {
            SKIP_INSTRUCTIONS: "1",
          },
        },
        true
      );
      console.log(`${pc.green("✓")} Button component installed!`);
    } catch (error) {
      console.error("Failed to initialize shadcn/ui:", error);
      throw error;
    }

    console.log(
      `\n${pc.green("✨")} Success! Created ${targetDir} at ${root}\n`
    );
    console.log("Happy Building! 🤝");
    console.log(targetDir);
  } else if (variant === "vue-app") {
    console.log("\nCreating new Vue app...");
    await executeCommand(
      "npm",
      ["create", "vite@latest", targetDir, "--", "--template", "vue-ts"],
      {}
    );

    const templateDir = path.resolve(
      fileURLToPath(import.meta.url),
      "..",
      "..",
      "..",
      "templates",
      variant
    );

    console.log("\nCustomizing template...");
    const filesToCopy = [
      "src/App.vue",
      "src/components/ConnectWallet.vue",
      "src/components/DefaultLayout.vue",
    ];

    for (const file of filesToCopy) {
      const srcFile = path.join(templateDir, file);
      const destFile = path.join(root, file);

      try {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
          console.log(`${pc.green("✓")} Created ${file}`);
        } else {
          console.warn(`Template file not found: ${file}`);
        }
      } catch (error) {
        console.warn(`Failed to copy template file ${file}:`, error);
      }
    }

    console.log("\nInstalling @omnisat/lasereyes...");
    try {
      await executeCommand(
        "npm",
        ["install", "@omnisat/lasereyes@latest", "--save"],
        { cwd: root }
      );
      console.log(`${pc.green("✓")} @omnisat/lasereyes installed!`);
    } catch (error) {
      console.error("Failed to install @omnisat/lasereyes:", error);
      throw error;
    }

    // Install additional Vue dependencies
    console.log("\nInstalling additional dependencies...");
    try {
      await executeCommand(
        "npm",
        [
          "install",
          "vue-router@4",
          "@vueuse/core",
          "@headlessui/vue",
          "@heroicons/vue",
          "--save",
          "--no-fund",
          "--no-audit",
          "--loglevel=error",
        ],
        { cwd: root },
        true
      );
      console.log("Dependencies installed!");
    } catch (error) {
      console.error("Failed to install additional dependencies:", error);
      throw error;
    }
  }

  const pkgManager = options.yarn ? "yarn" : options.pnpm ? "pnpm" : "npm";

  console.log(`\nDone. Now run:\n`);
  if (root !== process.cwd()) {
    console.log(`  cd ${path.relative(process.cwd(), root)}`);
  }
  console.log(`  ${pkgManager} run dev`);
  console.log();
}

function executeCommand(
  command: string,
  args: string[],
  options: any,
  silent = false
) {
  return new Promise<void>((resolve, reject) => {
    const spawnOptions = {
      ...options,
      stdio: silent ? "pipe" : "inherit",
      env: {
        ...process.env,
        ...options.env,
        npm_config_loglevel: "silent",
        npm_config_fund: "false",
        npm_config_audit: "false",
        npm_config_update_notifier: "false",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PRIVATE_SKIP_SETUP: "1",
        DEBUG: "",
        CI: "1",
        FORCE_COLOR: "0",
        NO_UPDATE_NOTIFIER: "1",
      },
    };

    // Show loading animation for create-next-app
    let loadingInterval: NodeJS.Timeout | null = null;
    if (args.includes("create-next-app")) {
      console.log("Creating new Next.js app...");
      const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      let i = 0;
      loadingInterval = setInterval(() => {
        process.stdout.write(`\r${frames[i]}`);
        i = (i + 1) % frames.length;
      }, 80);
    }

    const child = spawn(command, args, spawnOptions);

    if (silent) {
      let stderrOutput = "";

      if (child.stderr) {
        child.stderr.on("data", (data) => {
          const output = data.toString();
          if (output.toLowerCase().includes("error")) {
            stderrOutput += output;
          }
        });
      }

      if (child.stdout) {
        child.stdout.on("data", () => {
          // Intentionally empty to suppress output
        });
      }

      child.on("close", (code) => {
        if (loadingInterval) {
          clearInterval(loadingInterval);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
        }

        if (code !== 0) {
          if (stderrOutput) {
            console.error(stderrOutput);
          }
          reject(new Error(`${command} ${args.join(" ")} failed`));
          return;
        }
        resolve();
      });
    } else {
      child.on("close", (code) => {
        if (loadingInterval) {
          clearInterval(loadingInterval);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
        }

        if (code !== 0) {
          reject(new Error(`${command} ${args.join(" ")} failed`));
          return;
        }
        resolve();
      });
    }
  });
}

init().catch((e) => {
  console.error(e);
});
