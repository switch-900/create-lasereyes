#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import spawn from "cross-spawn";
import pc from "picocolors";
import prompts from "prompts";
import type { StdioOptions } from "child_process";

import { type Framework, frameworks } from "../frameworks.js";
import {
  emptyDir,
  formatTargetDir,
  isEmpty,
  pkgFromUserAgent,
  isValidPackageName,
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
  .option("--bun", "Use bun as your package manager")
  .option("--tailwind", "Install TailwindCSS", { default: true })
  .option("--shadcn", "Install Shadcn UI components", { default: true });

const defaultTargetDir = "lasereyes-project";

const renameFiles: Record<string, string | undefined> = {
  _gitignore: ".gitignore",
  "_env.local": ".env.local",
  _npmrc: ".npmrc",
};

interface PackageManagerCommands {
  install: string[];
  installDev: string[];
  run: string[];
  exec: string[];
  create: string[];
  execDirect: string[];
}

const packageManagersConfig: Record<string, PackageManagerCommands> = {
  npm: {
    install: ["install"],
    installDev: ["install", "-D"],
    run: ["run"],
    exec: ["exec"],
    create: ["create"],
    execDirect: ["npx"],
  },
  yarn: {
    install: ["add"],
    installDev: ["add", "-D"],
    run: ["run"],
    exec: ["exec"],
    create: ["create"],
    execDirect: ["dlx"],
  },
  pnpm: {
    install: ["add"],
    installDev: ["add", "-D"],
    run: ["run"],
    exec: ["exec"],
    create: ["create"],
    execDirect: ["dlx"],
  },
  bun: {
    install: ["add"],
    installDev: ["add", "-d"],
    run: ["run"],
    exec: ["x"],
    create: ["create"],
    execDirect: ["x"],
  },
};

function getPackageManager(options: any) {
  // First try to detect from user agent
  const userAgent = process.env.npm_config_user_agent;
  const userAgentPkg = pkgFromUserAgent(userAgent);
  
  let detectedPM: string | undefined;
  
  if (userAgentPkg) {
    const pkgName = userAgentPkg.name;
    if (pkgName === "yarn") detectedPM = "yarn";
    if (pkgName === "pnpm") detectedPM = "pnpm";
    if (pkgName === "bun") detectedPM = "bun";
    if (pkgName === "npm") detectedPM = "npm";
  }

  // Fall back to CLI options if no user agent or unrecognized
  const cliPM = options.yarn ? "yarn" : 
                options.pnpm ? "pnpm" : 
                options.bun ? "bun" : "npm";

  const finalPM = detectedPM || cliPM;
  
  console.log(`\nPackage Manager: ${finalPM} ${detectedPM ? '(detected from environment)' : '(from CLI options)'}`);
  
  if (process.env.DEBUG) {
    console.log('Package Manager Detection Details:');
    console.log('- User Agent:', userAgent);
    console.log('- Detected from UA:', detectedPM);
    console.log('- CLI Option:', cliPM);
    console.log('- Final Choice:', finalPM);
  }

  return finalPM;
}

function getPackageManagerCommand(packageManager: string, commandType: keyof PackageManagerCommands) {
  return packageManagersConfig[packageManager][commandType];
}

async function init() {
  const { args, options } = cli.parse(process.argv);
  if (options.help) return;

  const argTargetDir = formatTargetDir(args[0]);
  const argTemplate = options.template || options.t;

  let targetDir = argTargetDir || defaultTargetDir;
  const pkgManager = getPackageManager(options);

  // Gather all configuration upfront
  let result: prompts.Answers<
    "projectName" | "framework" | "variant" | "packageManager" | "addCursorRules" | "installShadcn" | "installTailwind" | "overwrite" | "overwriteChecker"
  >;

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : "text",
          name: "projectName",
          message: pc.reset("Project name:"),
          initial: defaultTargetDir,
          validate: (input: string) => {
            const validation = isValidPackageName(input);
            if (validation) {
              return true;
            }
            return "Invalid package.json name";
          },
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
          type: argTemplate && templates.includes(argTemplate) ? null : "select",
          name: "framework",
          message: pc.reset("Select a framework:"),
          initial: 0,
          choices: frameworks.map((framework) => {
            const frameworkColor = framework.color;
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework,
              disabled: framework.disabled,
            };
          }),
        },
        {
          type: (framework: Framework) =>
            framework?.variants && framework.variants.length > 0 ? "select" : null,
          name: "variant",
          message: pc.reset("Select a variant:"),
          initial: 0,
          choices: (framework: Framework) => {
            if (!framework?.variants) return [];
            return framework.variants.map((variant) => {
              const variantColor = variant.color;
              return {
                title: variantColor(variant.display || variant.name),
                value: variant.name,
                disabled: variant.disabled,
              };
            });
          },
        },
        {
          type: "select",
          name: "packageManager",
          message: pc.reset("Select a package manager:"),
          initial: pkgManager === "npm" ? 0 : pkgManager === "yarn" ? 1 : pkgManager === "pnpm" ? 2 : 3,
          choices: [
            { title: "npm", value: "npm" },
            { title: "yarn", value: "yarn" },
            { title: "pnpm", value: "pnpm" },
            { title: "bun", value: "bun" },
          ],
        },
        {
          type: "confirm",
          name: "installTailwind",
          message: pc.reset("Would you like to install TailwindCSS?"),
          initial: true,
        },
        {
          type: "confirm",
          name: "installShadcn",
          message: pc.reset("Would you like to install Shadcn UI components?"),
          initial: true,
        },
        {
          type: "confirm",
          name: "addCursorRules",
          message: pc.reset("Would you like to add LaserEyes-specific .cursorrules file?"),
          initial: true,
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

  const { framework, overwrite, variant, packageManager, installTailwind, installShadcn, addCursorRules } = result;
  const root = path.join(process.cwd(), targetDir);

  if (overwrite) {
    emptyDir(root);
  }

  // Display summary of choices
  console.log("\nProject Configuration Summary:");
  console.log(`${pc.green("✓")} Project Name: ${targetDir}`);
  console.log(`${pc.green("✓")} Framework: ${framework.display}`);
  console.log(`${pc.green("✓")} Variant: ${variant}`);
  console.log(`${pc.green("✓")} Package Manager: ${packageManager}`);
  console.log(`${pc.green("✓")} TailwindCSS: ${installTailwind ? "Yes" : "No"}`);
  console.log(`${pc.green("✓")} Shadcn UI: ${installShadcn ? "Yes" : "No"}`);
  console.log(`${pc.green("✓")} Cursor Rules: ${addCursorRules ? "Yes" : "No"}\n`);

  // Continue with the rest of the setup using the gathered configuration
  if (variant === "next-app") {
    console.log("\nCreating new Next.js app...");
    const projectName = path.basename(targetDir);
    const tempDir = path.join(process.cwd(), ".temp-next-app");
    
    const env = {
      ...process.env,
      npm_config_loglevel: "error",
      npm_config_fund: "false",
      npm_config_audit: "false",
      npm_config_update_notifier: "false",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PRIVATE_SKIP_SETUP: "1",
      FORCE_COLOR: "0",
      CI: "1",
    };
  
    const commonFlags = [
      "--ts",
      "--eslint",
      "--app",
      "--src-dir",
      "--import-alias", "@/*",
      "--no-git",
      "--yes"
    ];
  
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir);
  
      const projectPath = path.join(tempDir, projectName);
      fs.mkdirSync(projectPath);

      let args: string[];
      let execCommand: string[];
  
      if (packageManager === "bun") {
        execCommand = ["bun"];
        args = ["create", "next-app@14", ".", ...commonFlags];
      } else if (packageManager === "yarn") {
        // For yarn, use npx with --use-yarn flag
        execCommand = ["npx"];
        args = ["create-next-app@14", ".", "--use-yarn", ...commonFlags];
      } else if (packageManager === "pnpm") {
        execCommand = ["pnpm", "dlx"];
        args = ["create-next-app@14", ".", ...commonFlags];
      } else {
        execCommand = ["npx"];
        args = ["create-next-app@14", ".", ...commonFlags];
      }
  
      console.log(`\nCreating Next.js app using ${packageManager}...`);
      await executeCommand(execCommand[0], execCommand.slice(1).concat(args), { cwd: projectPath, env }, true);

      fs.renameSync(projectPath, targetDir);
      fs.rmSync(tempDir, { recursive: true, force: true });
  
      console.log(`\n${pc.green("✔")} Created Next.js app at ${targetDir}`);
  
      // Copy template files
      const templateDir = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "templates", variant);
      const filesToCopy = [
        "src/app/page.tsx",
        "src/app/layout.tsx",
        "src/components/DefaultLayout.tsx",
        "src/components/ConnectWallet.tsx",
        "src/components/ThemeToggle.tsx",
      ];
      console.log("\nCustomizing template...");
      for (const file of filesToCopy) {
        const srcFile = path.join(templateDir, file);
        const destFile = path.join(targetDir, file);
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
          console.log(`${pc.green("✓")} Created ${file}`);
        } else {
          console.warn(`Template file not found: ${file}`);
        }
      }
  
      // Install LaserEyes
      console.log("\nInstalling @omnisat/lasereyes...");
      await executeCommand(packageManager, getPackageManagerCommand(packageManager, "install").concat("@omnisat/lasereyes@latest"), { cwd: targetDir }, true);
      console.log(`${pc.green("✓")} @omnisat/lasereyes installed!\n`);
  
      // Add Cursor rules if selected
      if (addCursorRules) {
        console.log("\nAdding .cursorrules file...");
        const src = path.join(templateDir, ".cursorrules");
        const dest = path.join(targetDir, ".cursorrules");
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`${pc.green("✓")} Added .cursorrules`);
        } else {
          console.warn(`.cursorrules not found in template`);
        }
      }
  
      // Install next-themes
      console.log("\nInstalling next-themes...");
      await executeCommand(packageManager, getPackageManagerCommand(packageManager, "install").concat("next-themes"), { cwd: targetDir }, true);
      console.log(`${pc.green("✓")} next-themes installed`);
  
      if (installShadcn) {
        console.log("\nInitializing Shadcn...");

        const isYarnV1 =
          packageManager === "yarn" &&
          process.env.npm_config_user_agent?.includes("yarn/1");

        const runShadcnCommand = async (...args: string[]) => {
          if (packageManager === "npm") {
            await executeCommand(
              "npx",
              ["shadcn@2.3", ...args],
              {
                cwd: targetDir,
                env: {
                  ...env,
                  SKIP_INSTRUCTIONS: "1",
                },
              },
              true
            );
          } else if (isYarnV1) {
            await executeCommand(
              "npx",
              ["shadcn@2.3", ...args],
              {
                cwd: targetDir,
                env: {
                  ...env,
                  SKIP_INSTRUCTIONS: "1",
                },
              },
              true
            );
          } else {
            const execDirect = getPackageManagerCommand(packageManager, "execDirect");
            await executeCommand(
              packageManager,
              [...execDirect, "shadcn@2.3", ...args],
              {
                cwd: targetDir,
                env: {
                  ...env,
                  SKIP_INSTRUCTIONS: "1",
                },
              },
              true
            );
          }
        };

        try {
          // First run init with defaults
          await runShadcnCommand("init", "--yes", "--defaults");
          console.log(`${pc.green("✓")} Shadcn initialized successfully!`);

          // Then add components one by one
          const components = ["button", "dropdown-menu", "dialog"];
          for (const component of components) {
            console.log(`\nAdding ${component} component...`);
            await runShadcnCommand("add", component, "--yes");
            console.log(`${pc.green("✓")} ${component} installed`);
          }
        } catch (error) {
          console.error(`${pc.red("✖")} Failed to initialize Shadcn:`, error);
          throw error;
        }
      }
  
      console.log(`\n${pc.green("✨")} Success! Created ${targetDir}\n`);
      console.log("Next steps:\n");
      console.log(`  cd ${path.relative(process.cwd(), targetDir)}`);
      console.log(`  ${packageManager} run dev\n`);
      console.log("Happy Building! 🤝");
    } catch (error) {
      console.error(`\n${pc.red("✖")} Failed to create Next.js app:`, error);
      // Clean up on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      process.exit(1);
    }
  } else if (variant === "vue-app") {
    try {
      console.log("\nCreating new Vue app...");
      const createCmd = getPackageManagerCommand(packageManager, "create");
      
      await executeCommand(
        packageManager,
        [
          ...createCmd,
          "vite@latest",
          targetDir,
          "--",
          "--template",
          "vue-ts",
        ],
        {}
      );

      // Install @omnisat/lasereyes-vue
      console.log("\nInstalling @omnisat/lasereyes-vue...");
      const installCmd = getPackageManagerCommand(packageManager, "install");
      await executeCommand(
        packageManager,
        [...installCmd, "@omnisat/lasereyes-vue@latest"],
        { cwd: root },
        true
      );
      console.log(`${pc.green("✓")} @omnisat/lasereyes-vue installed!`);

      const templateDir = path.resolve(
        fileURLToPath(import.meta.url),
        "..",
        "..",
        "..",
        "templates",
        variant
      );

      // Copy template files - removed TailwindCSS related files
      console.log("\nCustomizing template...");
      const filesToCopy = [
        "src/App.vue",
        "src/main.ts",
        "src/style.css",
        "vite.config.ts",
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
    } catch (error) {
      console.error(`\n${pc.red("✖")} Failed to create Vue app:`, error);
      process.exit(1);
    }
  }

  console.log(`\nDone. Now run:\n`);
  if (root !== process.cwd()) {
    console.log(`  cd ${path.relative(process.cwd(), root)}`);
  }
  const runCmd = getPackageManagerCommand(packageManager, "run");
  console.log(`  ${packageManager} ${runCmd.join(" ")} dev`);
  console.log();
}

function executeCommand(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    args?: string[];
  } = {},
  silent = false
) {
  return new Promise<void>((resolve, reject) => {
    const finalArgs = options.args ? [...args, ...options.args] : args;
    const spawnOptions = {
      cwd: options.cwd,
      stdio: (silent ? "pipe" : "inherit") as StdioOptions,
      env: {
        ...process.env,
        ...options.env,
        npm_config_loglevel: silent ? "silent" : "info",
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

    // Loading animation for all commands
    let loadingInterval: NodeJS.Timeout | null = null;
    const dots = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
    let i = 0;

    if (silent) {
      loadingInterval = setInterval(() => {
        process.stdout.write(`\r${dots[i]}`);
        i = (i + 1) % dots.length;
      }, 80);
    }

    const child = spawn(command, finalArgs, spawnOptions);
    let stderrOutput = "";
    let stdoutOutput = "";

    if (silent) {
      if (child.stderr) {
        child.stderr.on("data", (data) => {
          const output = data.toString();
          if (output.toLowerCase().includes("error")) {
            stderrOutput += output;
          }
        });
      }

      if (child.stdout) {
        child.stdout.on("data", (data) => {
          stdoutOutput += data.toString();
        });
      }
    }

    child.on("close", (code) => {
      if (loadingInterval) {
        clearInterval(loadingInterval);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }

      if (code !== 0) {
        if (silent && stderrOutput) {
          console.error(`\nError running ${command} ${finalArgs.join(" ")}:`);
          console.error(stderrOutput);
        }
        reject(new Error(`${command} ${finalArgs.join(" ")} failed with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

init().catch((e) => {
  console.error(e);
});