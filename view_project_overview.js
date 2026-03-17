const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'view_project_overview.txt';
const MAX_SIZE_BYTES = 200 * 1024; // 200KB limit

// Define the files and folders to process
const targets = [
  { type: 'file', path: 'view_project_structure.txt' },
  { type: 'file', path: 'slp/backend-dotnet/project-structure.txt' },
  { type: 'file', path: 'slp/frontend-vue/project-structure.txt' },
  { type: 'dir',  path: 'database/tables', extension: '.sql' },
  { type: 'file', path: 'slp/infranstructure/docker-compose.yml' },
  { type: 'file', path: 'slp/infranstructure/piper-gateway/server.py' },
  { type: 'file', path: 'documents/overview.md' }
];

function consolidate() {
  let combinedContent = '';
  let processedCount = 0;

  console.log(`🚀 Starting concatenation into ${OUTPUT_FILE}...\n`);

  targets.forEach(target => {
    const absolutePath = path.resolve(target.path);

    if (target.type === 'file') {
      processFile(absolutePath);
    } else if (target.type === 'dir') {
      if (fs.existsSync(absolutePath) && fs.lstatSync(absolutePath).isDirectory()) {
        const files = fs.readdirSync(absolutePath);
        files.forEach(file => {
          if (path.extname(file) === target.extension) {
            processFile(path.join(absolutePath, file));
          }
        });
      } else {
        console.warn(`⚠️  Directory not found: ${target.path}`);
      }
    }
  });

  function processFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }

    const stats = fs.statSync(filePath);
    const fileName = path.relative(process.cwd(), filePath);

    // Skip check: 200KB limit
    if (stats.size >= MAX_SIZE_BYTES) {
      console.log(`⏭️  SKIPPED: ${fileName} (${(stats.size / 1024).toFixed(2)} KB is >= 200KB)`);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const header = `\n\n--- FILE: ${fileName} ---\n`;
      combinedContent += header + content;
      
      processedCount++;
      console.log(`✅ ADDED: ${fileName} (${content.length} chars)`);
    } catch (err) {
      console.error(`❌ Error reading ${fileName}:`, err.message);
    }
  }

  // Write the final file
  fs.writeFileSync(OUTPUT_FILE, combinedContent);

  // Final Stats
  const finalStats = fs.statSync(OUTPUT_FILE);
  const lineCount = combinedContent.split('\n').length;

  console.log(`\n${'='.repeat(30)}`);
  console.log(`🏁 CONSOLIDATION COMPLETE`);
  console.log(`- Total Files Combined: ${processedCount}`);
  console.log(`- Total Text Length:   ${combinedContent.length.toLocaleString()} characters`);
  console.log(`- Final File Size:     ${(finalStats.size / 1024).toFixed(2)} KB`);
  console.log(`- Total Line Number:   ${lineCount.toLocaleString()}`);
  console.log(`${'='.repeat(30)}`);
}

consolidate();