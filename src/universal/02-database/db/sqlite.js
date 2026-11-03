// SQLite, with node:sqlite that comes with Node 22.13+; no separate driver is needed.
// The database is a file: server, user and password are not used.
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

export async function connect(c) {
  if (!existsSync(c.file)) {
    throw new Error(`there is no file ${c.file}. Create it with: npm run sqlite:create`);
  }
  const db = new DatabaseSync(c.file);
  db.exec("PRAGMA foreign_keys = ON");          // SQLite checks foreign keys only when asked to

  return {
    describe: c.file,

    // node:sqlite is synchronous: while a query runs, Node does nothing else. With one user in
    // development that does not matter; for many users at once a server database is better.
    async run(texts) {
      const recordsets = texts.map((text) => db.prepare(text).all());
      return { recordsets };
    }
  };
}
