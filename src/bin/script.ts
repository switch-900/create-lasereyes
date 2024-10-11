#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer'; // Correct default import

async function run() {
    const frameworkQuestion = [
        {
            type: 'list',
            name: 'framework',
            message: 'Which framework would you like to use?',
            choices: ['Next.js'], // Add more frameworks later here
            default: 'Next.js'
        }
    ];

    // Ask the user which framework they want to use
    const { framework } = await inquirer.prompt(frameworkQuestion);

    // After selecting Next.js, ask for project-specific details
    const questions = [
        {
            type: 'input',
            name: 'projectName',
            message: 'What is the name of your project?',
            default: 'lasereyes-app'
        },
        {
            type: 'list',
            name: 'language',
            message: 'Which language would you like to use?',
            choices: ['JavaScript', 'TypeScript'],
            default: 'JavaScript'
        },
        {
            type: 'confirm',
            name: 'installTailwind',
            message: 'Would you like to install Tailwind CSS?',
            default: false
        }
    ];

    const answers = await inquirer.prompt(questions);
    const { projectName, language, installTailwind } = answers;

    // Check the selected framework and run the appropriate command
    if (framework === 'Next.js') {
        console.log(`Running create-next-app for project: ${projectName}...`);
        const createNextAppArgs = ['create-next-app', projectName];

        // Add --typescript flag if TypeScript is selected
        if (language === 'TypeScript') {
            createNextAppArgs.push('--typescript');
        }

        // Add --tailwind flag if the user selected Tailwind
        if (installTailwind) {
            createNextAppArgs.push('--tailwind');
        }

        // Run the npx command to scaffold the Next.js app
        const createNextApp = spawn('npx', createNextAppArgs, {
            stdio: 'inherit'
        });

        // After create-next-app completes
        createNextApp.on('close', async (code) => {
            if (code === 0) {
                console.log('Next.js project created successfully!');

                // Optionally modify the project after creation
                const readmeContent = `# ${projectName}\n\nBuilt with ${language}${installTailwind ? '\nTailwind: Enabled' : ''}`;
                fs.writeFileSync(path.join(process.cwd(), projectName, 'README.md'), readmeContent);

                console.log('README updated with custom content!');

                // Ask about Shadcn only if Tailwind was selected
                if (installTailwind) {
                    const shadcnQuestion = [
                        {
                            type: 'confirm',
                            name: 'installShadcn',
                            message: 'Would you like to install Shadcn for UI components?',
                            default: false
                        }
                    ];
                    const { installShadcn } = await inquirer.prompt(shadcnQuestion);

                    if (installShadcn) {
                        console.log('Installing Shadcn...');
                        const shadcnInstall = spawn('npx', ['shadcn@latest', 'init'], {
                            cwd: path.join(process.cwd(), projectName), // Set the working directory to the new project
                            stdio: 'inherit'
                        });

                        shadcnInstall.on('close', (shadcnCode) => {
                            if (shadcnCode === 0) {
                                console.log('Shadcn installed successfully!');
                            } else {
                                console.error(`Shadcn installation exited with code ${shadcnCode}`);
                            }
                        });
                    }
                }
            } else {
                console.error(`create-next-app process exited with code ${code}`);
            }
        });
    }
}

run();
