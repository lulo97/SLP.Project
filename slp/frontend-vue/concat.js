import { readFile, readdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

export async function concatFiles(folders, files, outputFile) {
    let combinedContent = '';
    
    // Process individual files first
    for (const file of files) {
        try {
            const content = await readFile(file, 'utf8');
            combinedContent += `\n--- File: ${file} ---\n\n`;
            combinedContent += content;
            combinedContent += '\n\n';
        } catch (err) {
            console.error(`Error reading file ${file}:`, err.message);
        }
    }
    
    // Process folders
    for (const folder of folders) {
        try {
            const folderFiles = await readdir(folder);
            
            for (const file of folderFiles) {
                const filePath = join(folder, file);
                const stats = await stat(filePath);
                
                if (stats.isFile()) {
                    const content = await readFile(filePath, 'utf8');
                    combinedContent += `\n--- File: ${filePath} ---\n\n`;
                    combinedContent += content;
                    combinedContent += '\n\n';
                }
            }
        } catch (err) {
            console.error(`Error reading folder ${folder}:`, err.message);
        }
    }
    
    // Write combined content to output file
    try {
        await writeFile(outputFile, combinedContent, 'utf8');
        console.log(`Successfully concatenated files to ${outputFile}`);
    } catch (err) {
        console.error('Error writing output file:', err.message);
    }
}

// Only run the example if this file is being executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    // Example usage
    const foldersToProcess = [
        './src',
    ];

    const filesToProcess = [
        './index.html',
        './tsconfig.app.json',
        './tsconfig.json',
        './tsconfig.node.json',
        './vite.config.ts'
    ];

    const outputFileName = './combined_output.txt';

    concatFiles(foldersToProcess, filesToProcess, outputFileName);
}