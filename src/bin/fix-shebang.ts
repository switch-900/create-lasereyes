import { promises as fs } from 'fs';
import { join } from 'path';

// Path to the compiled JavaScript file in your dist directory
const scriptPath = join(process.cwd(), 'dist/bin/script.js');

// The shebang line to add
const shebang = '#!/usr/bin/env node\n';

async function addShebang() {
    try {
        // Read the contents of the file
        let data = await fs.readFile(scriptPath, 'utf8');

        // Check if the shebang is already there and replace any existing shebang
        const shebangRegex = /^#!.*\n/;
        if (shebangRegex.test(data)) {
            console.log('Found existing shebang, replacing it.');
            data = data.replace(shebangRegex, '');
        }

        // Prepend the new shebang to the file content
        const updatedContent = shebang + data;

        // Write the updated content back to the file
        await fs.writeFile(scriptPath, updatedContent, 'utf8');
        console.log('Shebang added/replaced successfully!');

        // Set the correct permissions to make the file executable
        await fs.chmod(scriptPath, 0o755);
        console.log('Execution permissions added successfully!');
    } catch (err) {
        console.error('Error:', err);
    }
}

addShebang();
