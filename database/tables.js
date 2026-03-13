const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const DB = "postgres";
const USER = "postgres";
const PASSWORD = "123";

const OUTPUT_DIR = path.join(__dirname, "tables");
const CONCURRENCY = 6; // number of parallel dumps

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        maxBuffer: 1024 * 1024 * 50,
        env: { ...process.env, PGPASSWORD: PASSWORD },
      },
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err);
        resolve(stdout);
      }
    );
  });
}

function cleanSQL(sql) {
  return (
    sql
      // normalize windows line endings
      .replace(/\r\n/g, "\n")

      .split("\n")
      .filter((line) => {
        const l = line.trim();

        if (!l) return true; // keep blank lines (will be collapsed later)

        if (l.startsWith("--")) return false;
        if (l.startsWith("SET ")) return false;
        if (l.startsWith("SELECT pg_catalog")) return false;
        if (l.startsWith("\\restrict")) return false;
        if (l.startsWith("\\unrestrict")) return false;
        if (l.startsWith("SET default_tablespace")) return false;
        if (l.startsWith("SET default_table_access_method")) return false;

        return true;
      })
      .join("\n")

      // collapse ANY amount of blank lines
      .replace(/\n\s*\n\s*\n+/g, "\n\n")

      .trim() + "\n"
  );
}

/**
 * Sanity check: ensure the cleaned SQL still contains a CREATE TABLE statement
 * for the given table. Throws if missing or empty.
 */
function sanityCheck(sql, table) {
  if (!sql || sql.trim().length === 0) {
    throw new Error(`Sanity check failed: cleaned SQL for table "${table}" is empty.`);
  }

  // Escape regex special chars in table name
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Look for CREATE TABLE public."table" (with optional quotes, optional IF NOT EXISTS)
  const createPattern = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF NOT EXISTS\\s+)?(?:public\\.)?"?${escapedTable}"?\\s*\\(`,
    'i'
  );
  // Also try without schema prefix (some dumps omit "public.")
  const createPatternNoSchema = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF NOT EXISTS\\s+)?(?:")?${escapedTable}(?:")?\\s*\\(`,
    'i'
  );

  if (!createPattern.test(sql) && !createPatternNoSchema.test(sql)) {
    throw new Error(
      `Sanity check failed: cleaned SQL for table "${table}" does not contain a CREATE TABLE statement.`
    );
  }
}

async function getTables() {
  const result = await run(
    `psql -U ${USER} -d ${DB} -At -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"`
  );

  return result
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);
}

async function dumpTable(table) {
  const safeName = table.replace(/[^\w]/g, "_");
  const filePath = path.join(OUTPUT_DIR, `${safeName}.sql`);

  console.log(`Exporting ${table} -> ${safeName}.sql`);

  const dump = await run(
    `pg_dump -U ${USER} -d ${DB} -t "${table}" --schema-only --no-owner --no-privileges --no-comments`
  );

  const cleaned = cleanSQL(dump);

  // Run sanity check before writing
  sanityCheck(cleaned, table);

  fs.writeFileSync(filePath, cleaned);
}

async function runPool(tasks, limit) {
  const executing = [];

  for (const task of tasks) {
    const p = task().then(() =>
      executing.splice(executing.indexOf(p), 1)
    );

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

async function main() {
  try {
    const tables = await getTables();

    if (tables.length === 0) {
      console.log("No tables found in public schema. Exiting.");
      return;
    }

    console.log("Tables found:", tables);

    const tasks = tables.map((table) => () => dumpTable(table));

    await runPool(tasks, CONCURRENCY);

    console.log("All tables exported successfully.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();