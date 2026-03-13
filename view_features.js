const fs = require("fs");
const path = require("path");

// keywords to search in filenames (case-insensitive)
const keywords = ["source"];

// folders/files to exclude
const exclude = new Set([
  "node_modules",
  "dist",
  "build",
  "obj",
  "bin",
  ".git",
  ".vs",
  ".github",
  "documents",
  "project_tasks",
  "notes",
]);

function matchKeyword(name) {
  const lower = name.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

function scan(dir, results = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (exclude.has(item.name)) continue;

    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      scan(fullPath, results);
    } else {
      if (matchKeyword(item.name)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function concatFiles(files) {
  let output = "";

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf8");

      output += `\n\n====================\n`;
      output += `FILE: ${file}\n`;
      output += `====================\n`;
      output += content;
    } catch (err) {
      console.error("Cannot read:", file);
    }
  }

  return output;
}

const files = scan(process.cwd());
const bigText = concatFiles(files);

// save to file
fs.writeFileSync("view_features.txt", bigText, "utf8");

console.log("Saved to view_features.txt");