const fs = require("fs");
const path = require("path");

// Hardcoded folders and files
const folders = ["./Features", "./Middlewares"];
const files = ["./Program.cs", "./appsettings.json"];

const outputFile = "./combined.txt";
let output = "";
// Recursive function
function collectCsFiles(dir) {
    let results = [];

    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(collectCsFiles(fullPath));
        } else if (file.endsWith(".cs")) {
            results.push(fullPath);
        }
    });

    return results;
}

// Process folders
folders.forEach(folder => {
    const csFiles = collectCsFiles(folder);

    csFiles.forEach(file => {
        const content = fs.readFileSync(file, "utf8");

        output += `\n\n===== ${file} =====\n\n`;
        output += content;
    });
});

// Process standalone files
files.forEach(file => {
    if (!fs.existsSync(file)) return;

    const content = fs.readFileSync(file, "utf8");

    output += `\n\n===== ${file} =====\n\n`;
    output += content;
});

// Write output
fs.writeFileSync(outputFile, output, "utf8");

console.log(`Combined ${outputFile} successfully`);