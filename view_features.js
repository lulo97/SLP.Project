const fs = require("fs");
const path = require("path");

// =======================
// CONFIGURATION
// =======================
const config = {
  // Filenames must contain at least one of these keywords (case‑insensitive)
  // Leave empty to include all files (subject to excludeKeywords)
  keywords: ["source", "explanation", "favorite"],

  // Filenames that contain any of these keywords will be EXCLUDED (case‑insensitive)
  excludeKeywords: [],   // <-- add your exclude terms here

  // Which parts of the project to scan:
  // Choose from "backend", "frontend", "database", "test"
  // Leave empty or comment out to include all.
  selectedOptions: ["backend", "database", "frontend"]   // <-- change this as needed
};

// Folder patterns for each option (using path.sep for cross‑platform compatibility)
const optionPathPatterns = {
  backend:  [path.sep + 'backend-dotnet'  + path.sep],
  frontend: [path.sep + 'frontend-vue'    + path.sep],
  database: [path.sep + 'database'        + path.sep],
  test:     [path.sep + 'e2e_tests'       + path.sep],
};

// Folders/files to exclude entirely
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

// Determine which options are active
const validOptions = Object.keys(optionPathPatterns);
const selectedOptions = (config.selectedOptions && config.selectedOptions.length)
  ? config.selectedOptions.filter(opt => validOptions.includes(opt))
  : validOptions; // default to all if none specified

// Build list of allowed path patterns (OR logic)
let allowedPathPatterns = [];
for (const opt of selectedOptions) {
  allowedPathPatterns.push(...optionPathPatterns[opt]);
}

console.log(`Include keywords: ${config.keywords.length ? config.keywords.join(", ") : "(all files)"}`);
console.log(`Exclude keywords: ${config.excludeKeywords.length ? config.excludeKeywords.join(", ") : "(none)"}`);
console.log(`Selected project areas: ${selectedOptions.join(", ")}`);
console.log(`Path patterns: ${allowedPathPatterns.map(p => p.replace(/\\/g, '/')).join(", ")}`);

// Helper: check if filename matches any include keyword (if any)
function matchesInclude(name) {
  if (config.keywords.length === 0) return true; // no include filter = include everything
  const lower = name.toLowerCase();
  return config.keywords.some(k => lower.includes(k.toLowerCase()));
}

// Helper: check if filename matches any exclude keyword
function matchesExclude(name) {
  if (config.excludeKeywords.length === 0) return false;
  const lower = name.toLowerCase();
  return config.excludeKeywords.some(k => lower.includes(k.toLowerCase()));
}

// Helper: check if file path matches any allowed pattern
function matchPath(filePath) {
  if (allowedPathPatterns.length === 0) return true; // no filter = include all
  return allowedPathPatterns.some(pattern => filePath.includes(pattern));
}

// Recursively scan directory
function scan(dir, results = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (exclude.has(item.name)) continue;

    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      scan(fullPath, results);
    } else {
      // Include if it matches include keywords (or none) AND does NOT match exclude keywords
      if (matchesInclude(item.name) && !matchesExclude(item.name) && matchPath(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// Concatenate file contents with headers
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

fs.writeFileSync("view_features.txt", bigText, "utf8");

console.log(`\nSaved to view_features.txt (${files.length} files)`);