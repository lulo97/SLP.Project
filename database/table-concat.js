const fs = require("fs");
const path = require("path");

const INPUT_DIR = path.join(__dirname, "tables");
const OUTPUT_FILE = path.join(__dirname, "all_tables_safe.sql");

function readFiles(dir) {
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

  // Foreign keys must run last
  if (/^ALTER\s+TABLE\b/i.test(s) && /\bFOREIGN\s+KEY\b/i.test(s)) {
    return "foreignKey";
  }

  if (/^CREATE\s+INDEX\b/i.test(s) || /^CREATE\s+UNIQUE\s+INDEX\b/i.test(s)) {
    return "index";
  }

  // sequences, defaults, PKs, UNIQUEs, CHECKs, ownerships, etc.
  return "setup";
}

function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Folder not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  const files = readFiles(INPUT_DIR);

  const createTables = [];
  const setup = [];
  const indexes = [];
  const foreignKeys = [];

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

  const output = [
    "BEGIN;",
    "",
    "-- ===============================",
    "-- 1) CREATE TABLES",
    "-- ===============================",
    "",
    ...createTables,
    "",
    "-- ===============================",
    "-- 2) SETUP: SEQUENCES / DEFAULTS / PK / UNIQUE / CHECK",
    "-- ===============================",
    "",
    ...setup,
    "",
    "-- ===============================",
    "-- 3) INDEXES",
    "-- ===============================",
    "",
    ...indexes,
    "",
    "-- ===============================",
    "-- 4) FOREIGN KEYS",
    "-- ===============================",
    "",
    ...foreignKeys,
    "",
    "COMMIT;",
    "",
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, output, "utf8");
  console.log(`Done: ${OUTPUT_FILE}`);
}

main();