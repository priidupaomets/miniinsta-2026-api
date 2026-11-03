// The database layer. Routes only see this file, never a driver.
//
//   DB_ENGINE=mssql | mysql | postgres | sqlite      (in .env)
//
// Each engine has two files:
//   db/<engine>.js        connects and runs SQL with that engine's driver
//   queries/<engine>.js   the same named queries, written in that engine's SQL dialect
// Only the chosen engine's files are loaded, so a missing driver for another engine does no harm.

export const engines = ["mssql", "mysql", "postgres", "sqlite"];
export const engine = (process.env.DB_ENGINE || "mssql").toLowerCase();

if (!engines.includes(engine)) {
  console.error(`Unknown DB_ENGINE "${engine}". Possible values: ${engines.join(", ")}`);
  process.exit(1);
}

const adapter = await import(`./${engine}.js`);
export const queries = await import(`../queries/${engine}.js`);

const config = {
  server:   process.env.DB_SERVER || "localhost",
  port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,          // from .env, never from the code
  file:     process.env.DB_FILE || "./MiniInsta2026.db"
};

// One connection (pool) for the whole application. server.js starts listening only after this
// is done, because importing this file waits for the top-level await.
let connection;
try {
  connection = await adapter.connect(config);
  console.log(`Connected: ${engine} / ${connection.describe}`);
} catch (err) {
  console.error(`Could not connect to the database (${engine}):`, err.message);
  process.exit(1);
}

// A query that is only a comment ("-- PLACEHOLDER …") has not been written yet.
const isPlaceholder = (text) => text.split("\n").every((line) => line.trim() === "" || line.trim().startsWith("--"));

// Runs one SQL text, or several (an array), and returns { recordset, recordsets } like the mssql
// package: recordsets has one array of rows per SELECT, recordset is the first of them.
export async function query(texts) {
  const list = Array.isArray(texts) ? texts : [texts];
  const placeholder = list.find(isPlaceholder);
  if (placeholder) throw new Error(`Query not written yet: ${placeholder.trim().split("\n")[0]}`);

  const result = await connection.run(list);
  return { recordset: result.recordsets[0], recordsets: result.recordsets };
}
