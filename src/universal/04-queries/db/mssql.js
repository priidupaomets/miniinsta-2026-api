// MS SQL Server, with the mssql package (tedious).
import sql from "mssql";

export async function connect(c) {
  const pool = await sql.connect({
    server:   c.server,
    port:     c.port,                           // empty = 1433 (or a named instance)
    database: c.database,
    user:     c.user,
    password: c.password,
    options:  { encrypt: true, trustServerCertificate: true }   // development setting
  });
  sql.on("error", (err) => console.error("MSSQL error:", err.message));

  return {
    describe: `${c.server} / ${c.database}`,

    // All texts go to the server as ONE batch, in one round trip; every SELECT returns its own
    // result set.
    async run(texts) {
      const result = await pool.request().query(texts.join(";\n"));
      return { recordsets: result.recordsets };
    }
  };
}
