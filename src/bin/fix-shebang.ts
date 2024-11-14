import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.join(__dirname, "script.js");

try {
  const content = fs.readFileSync(scriptPath, "utf8");
  const hasShebang = content.startsWith("#!");

  const newContent = hasShebang
    ? content.replace(/^#!.*/, "#!/usr/bin/env node")
    : "#!/usr/bin/env node\n" + content;

  fs.writeFileSync(scriptPath, newContent);
  fs.chmodSync(scriptPath, "755");

  console.log(
    hasShebang
      ? "Found existing shebang, replacing it."
      : "No shebang found, adding it."
  );
  console.log("Shebang added/replaced successfully!");
  console.log("Execution permissions added successfully!");
} catch (error) {
  console.error("Error processing file:", error);
}
