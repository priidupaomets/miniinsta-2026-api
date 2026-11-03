// MySQL 8, with the mysql2 package.
import mysql from "mysql2/promise";

export async function connect(c) {
  const pool = mysql.createPool({
    host:     c.server,
    port:     c.port || 3306,
    database: c.database,
    user:     c.user,
    password: c.password,
    timezone: "Z",              // DATETIME values are UTC, as in the other engines
    decimalNumbers: true        // DECIMAL (for example the result of AVG) as a number, not as text
  });
  await pool.query("SELECT 1");                 // check the connection now, not at the first request

  return {
    describe: `${c.server}:${c.port || 3306} / ${c.database}`,

    // One text at a time: every text is one round trip.
    async run(texts) {
      const recordsets = [];
      for (const text of texts) {
        const [rows] = await pool.query(text);
        recordsets.push(rows);
      }
      return { recordsets, calls: texts.length };
    }
  };
}
