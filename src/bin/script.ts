#!/usr/bin/env node
/** @format */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import inquirer from "inquirer"; // Correct default import
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyTemplateFiles(projectPath: string) {
  try {
    // Move up two directories from dist/bin to get to src/templates
    const sourceDir = path.join(
      dirname(dirname(__dirname)),
      "src",
      "templates",
      "next"
    );
    const targetDir = path.join(projectPath, "app");
    const componentsDir = path.join(targetDir, "components");

    // Ensure target directories exist
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.mkdir(componentsDir, { recursive: true });

    // Map of template files to their target names and locations
    const fileMap = [
      {
        source: "page.txt",
        target: path.join(targetDir, "page.tsx"),
      },
      {
        source: "layout.txt",
        target: path.join(targetDir, "layout.tsx"),
      },
      {
        source: "components/DefaultLayout.txt",
        target: path.join(targetDir, "components", "DefaultLayout.tsx"),
      },
      {
        source: "components/ConnectWallet.txt",
        target: path.join(targetDir, "components", "ConnectWallet.tsx"),
      },
    ];

    // Copy and rename each file
    for (const file of fileMap) {
      const sourcePath = path.join(sourceDir, file.source);
      try {
        const content = await fs.promises.readFile(sourcePath, "utf8");
        await fs.promises.writeFile(file.target, content, "utf8");
        console.log(`✅ Copied ${path.basename(file.target)} successfully`);
      } catch (err) {
        console.error(`Error copying ${file.source}:`, err);
      }
    }

    // After copying files, update imports if needed
    const connectWalletPath = path.join(componentsDir, "ConnectWallet.tsx");
    if (fs.existsSync(connectWalletPath)) {
      let connectWalletContent = await fs.promises.readFile(
        connectWalletPath,
        "utf8"
      );
      connectWalletContent = connectWalletContent.replace(
        'import { Button } from "./ui/button"',
        'import { Button } from "@/components/ui/button"'
      );
      await fs.promises.writeFile(connectWalletPath, connectWalletContent);
    }

    // Update layout imports
    const layoutPath = path.join(targetDir, "layout.tsx");
    if (fs.existsSync(layoutPath)) {
      let layoutContent = await fs.promises.readFile(layoutPath, "utf8");
      layoutContent = layoutContent.replace(
        'import DefaultLayout from "./DefaultLayout"',
        'import DefaultLayout from "./components/DefaultLayout"'
      );
      await fs.promises.writeFile(layoutPath, layoutContent);
    }

    console.log("✨ All template files copied successfully!");
  } catch (error) {
    console.error("Error copying template files:", error);
  }
}

async function run() {
  const frameworkQuestion = [
    {
      type: "list",
      name: "framework",
      message: "Which framework would you like to use?",
      choices: ["Next.js"], // Add more frameworks later here
      default: "Next.js",
    },
  ];

  // Ask the user which framework they want to use
  const { framework } = await inquirer.prompt(frameworkQuestion);

  // After selecting Next.js, ask for project-specific details
  const questions = [
    {
      type: "input",
      name: "projectName",
      message: "What is the name of your project?",
      default: "lasereyes-app",
    },
    {
      type: "list",
      name: "language",
      message: "Which language would you like to use?",
      choices: ["JavaScript", "TypeScript"],
      default: "JavaScript",
    },
    {
      type: "confirm",
      name: "installTailwind",
      message: "Would you like to install Tailwind CSS?",
      default: false,
    },
  ];

  const answers = await inquirer.prompt(questions);
  const { projectName, language, installTailwind } = answers;

  // Check the selected framework and run the appropriate command
  if (framework === "Next.js") {
    console.log(`Running create-next-app for project: ${projectName}...`);
    const createNextAppArgs = ["create-next-app@14.2.3", projectName];

    // Add --typescript flag if TypeScript is selected
    if (language === "TypeScript") {
      createNextAppArgs.push("--typescript");
    }

    // Add --tailwind flag if the user selected Tailwind
    if (installTailwind) {
      createNextAppArgs.push("--tailwind");
    }

    // Run the npx command to scaffold the Next.js app
    const createNextApp = spawn("npx", createNextAppArgs, {
      stdio: "inherit",
    });

    // After create-next-app completes
    createNextApp.on("close", async (code) => {
      if (code === 0) {
        console.log("Next.js project created successfully!");

        const projectPath = path.join(process.cwd(), projectName);

        // Copy template files first
        await copyTemplateFiles(projectPath);

        // Then install @omnisat/lasereyes
        console.log("Installing @omnisat/lasereyes...");
        const installLaserEyes = spawn(
          "npm",
          ["install", "@omnisat/lasereyes", "--no-audit"],
          {
            cwd: projectPath,
            stdio: "inherit",
          }
        );

        installLaserEyes.on("close", async (laserEyesCode) => {
          if (laserEyesCode === 0) {
            console.log("✨ @omnisat/lasereyes installed successfully!");

            // Update README
            const readmeContent = `# ${projectName}\n\nBuilt with ${language}${
              installTailwind ? "\nTailwind: Enabled" : ""
            }\nIncludes @omnisat/lasereyes`;
            fs.writeFileSync(
              path.join(process.cwd(), projectName, "README.md"),
              readmeContent
            );

            console.log("README updated with custom content!");

            // Continue with Shadcn installation if Tailwind was selected
            if (installTailwind) {
              const shadcnQuestion = [
                {
                  type: "confirm",
                  name: "installShadcn",
                  message:
                    "Would you like to install Shadcn for UI components?",
                  default: false,
                },
              ];
              const { installShadcn } = await inquirer.prompt(shadcnQuestion);

              if (installShadcn) {
                console.log("Installing Shadcn...");
                const shadcnInstall = spawn("npx", ["shadcn@latest", "init"], {
                  cwd: projectPath,
                  stdio: "inherit",
                });

                shadcnInstall.on("close", async (shadcnCode) => {
                  if (shadcnCode === 0) {
                    console.log("Shadcn installed successfully!");

                    // Install button component first
                    const installShadcnButton = spawn(
                      "npx",
                      ["shadcn-ui@latest", "add", "button"],
                      {
                        cwd: projectPath,
                        stdio: "inherit",
                      }
                    );

                    installShadcnButton.on("close", async (buttonCode) => {
                      if (buttonCode === 0) {
                        // Now copy template files to correct locations
                        const componentsDir = path.join(
                          projectPath,
                          "app",
                          "components"
                        );

                        // Ensure components directory exists
                        await fs.promises.mkdir(componentsDir, {
                          recursive: true,
                        });

                        // Move or copy files to correct locations
                        try {
                          // Copy DefaultLayout to components folder
                          await fs.promises.rename(
                            path.join(projectPath, "app", "DefaultLayout.tsx"),
                            path.join(componentsDir, "DefaultLayout.tsx")
                          );

                          // Copy ConnectWallet to components folder
                          await fs.promises.rename(
                            path.join(projectPath, "app", "ConnectWallet.tsx"),
                            path.join(componentsDir, "ConnectWallet.tsx")
                          );

                          // Update layout.tsx imports
                          const layoutPath = path.join(
                            projectPath,
                            "app",
                            "layout.tsx"
                          );
                          let layoutContent = await fs.promises.readFile(
                            layoutPath,
                            "utf8"
                          );
                          layoutContent = layoutContent.replace(
                            'import DefaultLayout from "./DefaultLayout"',
                            'import DefaultLayout from "./components/DefaultLayout"'
                          );
                          await fs.promises.writeFile(
                            layoutPath,
                            layoutContent
                          );

                          console.log("✨ Components organized successfully!");
                        } catch (err) {
                          console.error("Error organizing components:", err);
                        }
                      }
                    });
                  }
                });
              }
            }

            // After everything is done, CD into the project directory
            try {
              console.log(
                `✨ Success! Created ${projectName} at ${projectPath}`
              );
              console.log("\nHappy Building! 🤝");
              // Output project name as last line for shell script
              console.log(projectName);
            } catch (err) {
              console.error("Failed:", err);
            }
          } else {
            console.error(
              `LaserEyes installation failed with code ${laserEyesCode}`
            );
          }
        });
      } else {
        console.error(`create-next-app process exited with code ${code}`);
      }
    });
  }
}

run();
