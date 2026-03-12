const fs = require("fs");
const path = require("path");

// folders/files to exclude
const exclude  = new Set([
  "node_modules",
  "dist",
  "build",
  "obj",
  "bin",
  ".git",
  "sample_project",
  ".vs",
  ".github",
  "documents",
  "project_tasks",
  "notes",
  "view_project_structure.js"
]);

function printTree(dir, level = 0) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (exclude.has(item.name)) continue;

    const indent = "\t".repeat(level);
    console.log(indent + item.name);

    if (item.isDirectory()) {
      const next = path.join(dir, item.name);
      printTree(next, level + 1);
    }
  }
}

printTree(process.cwd());