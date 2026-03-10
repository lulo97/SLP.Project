const fs = require("fs");
const path = require("path");

const folderPath = __dirname; // current folder
const outputFile = path.join(folderPath, "combined.txt");

async function combineMdFiles() {
  try {
    const files = await fs.promises.readdir(folderPath);

    const mdFiles = files.filter(file => path.extname(file) === ".md");

    let output = "";

    for (const file of mdFiles) {
      const filePath = path.join(folderPath, file);
      const content = await fs.promises.readFile(filePath, "utf8");

      const name = path.basename(file, ".md");

      output += `=== START ${name} ===\n`;
      output += content + "\n";
      output += `=== END ${name} ===\n\n`;
    }

    await fs.promises.writeFile(outputFile, output, "utf8");

    console.log(`Combined ${mdFiles.length} files into ${outputFile}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

combineMdFiles();