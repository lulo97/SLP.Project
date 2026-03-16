import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname);
const outputFile = path.join(rootDir, "project-structure.txt");

const MAX_FILE_SIZE = 200 * 1024; // 200KB

const skipDirs = [
  ".git",
  ".vs",
  "bin",
  "obj",
  "logs",
  "uploads",
  "Features"
];

const skipFiles = [
  "project-structure.txt"
];

const skipExtensions = [
  ".png",".jpg",".jpeg",".gif",".svg",
  ".ico",".pdf",".zip",".mp4",".mp3",
  ".woff",".woff2",".ttf",
  ".db",".bin",".vsidx",".suo",".cache"
];

function shouldSkipFile(filePath) {

  const fileName = path.basename(filePath);

  if (skipFiles.includes(fileName)) return true;

  // skip the script itself
  if (filePath === __filename) return true;

  const ext = path.extname(filePath).toLowerCase();
  if (skipExtensions.includes(ext)) return true;

  return false;
}

function shouldSkipDir(dirPath) {
  return skipDirs.some(skip =>
    dirPath.split(path.sep).includes(skip)
  );
}

function walk(dir, results = []) {

  const list = fs.readdirSync(dir);

  for (const file of list) {

    const fullPath = path.join(dir, file);

    if (shouldSkipDir(fullPath)) continue;

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, results);
      continue;
    }

    if (shouldSkipFile(fullPath)) continue;

    if (stat.size > MAX_FILE_SIZE) {
      console.log("Skipping large file:", fullPath);
      continue;
    }

    console.log(fullPath);

    results.push(fullPath);
  }

  return results;
}

function concatFiles() {

  // 🔹 always clear file first
  fs.writeFileSync(outputFile, "");

  const files = walk(rootDir);

  const stream = fs.createWriteStream(outputFile, { flags: "a" });

  for (const file of files) {

    try {

      const relative = path.relative(rootDir, file);
      const content = fs.readFileSync(file, "utf8");

      stream.write(`\n\n===== FILE: ${relative} =====\n\n`);
      stream.write(content);

    } catch {
      console.log("Skipping unreadable:", file);
    }

  }

  stream.end();

  console.log("Done! Output written to:", outputFile);
}

concatFiles();