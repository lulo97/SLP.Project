const fs = require("fs");
const path = require("path");

const INPUT_DIR = path.join(__dirname, "tables");
const SEED_FILE = path.join(__dirname, "seed_data.sql");
const OUTPUT_FILE = path.join(__dirname, "all_tables_safe.sql");

/**
 * 1. Initialize Database SQL
 * Drops and recreates the public schema to ensure a clean slate.
 */
const SCHEMA_INIT = `
-- ===============================================
-- 0) RESET SCHEMA
-- ===============================================
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres; 
GRANT ALL ON SCHEMA public TO public;

BEGIN;
`;

function readFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function splitStatements(sql) {
  const lines = sql.replace(/\r\n/g, "\n").split("\n");
  const statements = [];
  let current = [];

  for (const line of lines) {
    if (!line.trim() && current.length === 0) continue;
    current.push(line);
    if (line.trim().endsWith(";")) {
      const stmt = current.join("\n").trim();
      if (stmt) statements.push(stmt);
      current = [];
    }
  }
  const tail = current.join("\n").trim();
  if (tail) statements.push(tail);
  return statements;
}

function classifyStatement(stmt) {
  const s = stmt.trim();
  if (/^CREATE\s+TABLE\b/i.test(s)) return "createTable";
  if (/^ALTER\s+TABLE\b/i.test(s) && /\bFOREIGN\s+KEY\b/i.test(s)) return "foreignKey";
  if (/^CREATE\s+INDEX\b/i.test(s) || /^CREATE\s+UNIQUE\s+INDEX\b/i.test(s)) return "index";
  return "setup";
}

function main() {
  // 1. Check Input Directory
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Folder not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  // 2. Read Seed Data (if exists)
  let seedDataContent = "-- No seed data found.";
  if (fs.existsSync(SEED_FILE)) {
    seedDataContent = fs.readFileSync(SEED_FILE, "utf8");
  } else {
    console.warn(`Warning: ${SEED_FILE} not found. Proceeding without seeding.`);
  }

  const files = readFiles(INPUT_DIR);
  const createTables = [];
  const setup = [];
  const indexes = [];
  const foreignKeys = [];

  // 3. Process Table Files
  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const sql = fs.readFileSync(filePath, "utf8");
    const statements = splitStatements(sql);

    for (const stmt of statements) {
      const kind = classifyStatement(stmt);
      const block = `-- FILE: ${file}\n${stmt.trim()}\n`;

      if (kind === "createTable") createTables.push(block);
      else if (kind === "setup") setup.push(block);
      else if (kind === "index") indexes.push(block);
      else foreignKeys.push(block);
    }
  }

  // 4. Assemble Final Output
  const output = [
    SCHEMA_INIT,
    "",
    "-- ===============================",
    "-- 1) CREATE TABLES",
    "-- ===============================",
    ...createTables,
    "",
    "-- ===============================",
    "-- 2) SETUP: SEQUENCES / DEFAULTS / PK / UNIQUE / CHECK",
    "-- ===============================",
    ...setup,
    "",
    "-- ===============================",
    "-- 3) INDEXES",
    "-- ===============================",
    ...indexes,
    "",
    "-- ===============================",
    "-- 4) FOREIGN KEYS",
    "-- ===============================",
    ...foreignKeys,
    "",
    "-- ===============================",
    "-- 5) SEED DATA",
    "-- ===============================",
    seedDataContent,
    "",
    "COMMIT;",
  ].join("\n");

  // 5. Write to File
  fs.writeFileSync(OUTPUT_FILE, output, "utf8");
  console.log(`Successfully generated: ${OUTPUT_FILE}`);
}

main();