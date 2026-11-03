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
    describe: `${c.server} / ${c.database}${c.statsIo ? " (STATISTICS IO on)" : ""}`,
    statsIo: c.statsIo,

    // All texts go to the server as ONE batch, in one round trip; every SELECT returns its own
    // result set. With STATS_IO=1 the server also reports the pages read, which we add up.
    async run(texts) {
      const request = pool.request();
      let reads = 0;
      if (c.statsIo) {
        request.on("info", (msg) => {
          for (const m of msg.message.matchAll(/logical reads (\d+)/g)) reads += Number(m[1]);
        });
      }

      const text = texts.join(";\n");
      const result = await request.query(c.statsIo ? `SET STATISTICS IO ON;\n${text}` : text);
      return { recordsets: result.recordsets, calls: 1, reads };
    }
  };
}
