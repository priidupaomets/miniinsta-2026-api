// PostgreSQL, with the pg package.
import pg from "pg";

// By default pg returns some types as text, because a JavaScript number cannot hold every value.
// The MiniInsta numbers fit, so we turn them into numbers to get the same JSON as the other engines.
pg.types.setTypeParser(20, (v) => Number(v));          // bigint: COUNT(*)
pg.types.setTypeParser(1700, (v) => Number(v));        // numeric: AVG, ROUND
// TIMESTAMP (without time zone) is read as UTC and DATE as UTC midnight, as the mssql package does.
pg.types.setTypeParser(1114, (v) => new Date(v.replace(" ", "T") + "Z"));
pg.types.setTypeParser(1082, (v) => new Date(v + "T00:00:00Z"));

export async function connect(c) {
  const pool = new pg.Pool({
    host:     c.server,
    port:     c.port || 5432,
    database: c.database,
    user:     c.user,
    password: c.password
  });
  await pool.query("SELECT 1");                 // check the connection now
  pool.on("error", (err) => console.error("PostgreSQL error:", err.message));

  return {
    describe: `${c.server}:${c.port || 5432} / ${c.database}`,

    // One text at a time: every text is one round trip.
    async run(texts) {
      const recordsets = [];
      for (const text of texts) {
        const result = await pool.query(text);
        recordsets.push(result.rows);
      }
      return { recordsets, calls: texts.length };
    }
  };
}
