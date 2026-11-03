// create-sqlite.js — creates the SQLite database file from the MiniInsta script (for DB_ENGINE=sqlite)
//
//   npm run sqlite:create                              the script from the miniinsta-2026-db repository next to this one
//   node create-sqlite.js <script.sql> [file.db]       another script or another file name
//
// The sqlite3 command line gives the same result:  sqlite3 MiniInsta2026.db < MiniInsta2026-SQLite.sql
// This script is there so that the sqlite3 program is not needed (for example on Windows).
// An existing file is overwritten: part 01 of the script drops and creates the tables again.

import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const defaultScript = fileURLToPath(new URL(
  "../../../../miniinsta-2026-db/src/regular/SQLite/MiniInsta2026-SQLite.sql", import.meta.url));

const script = process.argv[2] || defaultScript;
const file = process.argv[3] || process.env.DB_FILE || "./MiniInsta2026.db";

if (!existsSync(script)) {
  console.error(`Script not found: ${script}`);
  console.error("Give the path yourself: node create-sqlite.js <path>/MiniInsta2026-SQLite.sql");
  process.exit(1);
}

const db = new DatabaseSync(file);
db.exec(readFileSync(script, "utf8"));

const counts = db.prepare(`
SELECT (SELECT COUNT(*) FROM "User") AS Users, (SELECT COUNT(*) FROM Post) AS Posts,
       (SELECT COUNT(*) FROM Comment) AS Comments, (SELECT COUNT(*) FROM Following) AS Following`).get();
db.close();

console.log(`Done: ${file}`);
console.log(`Users ${counts.Users}, posts ${counts.Posts}, comments ${counts.Comments}, follows ${counts.Following}`);
console.log("Expected: 200, 500, 900, 446");
