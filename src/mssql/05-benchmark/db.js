import sql from "mssql";
import { AsyncLocalStorage } from "node:async_hooks";

const config = {
  server:   process.env.DB_SERVER || "localhost",
  port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,          // .env-ist, mitte siit
  options:  { encrypt: true, trustServerCertificate: true }   // arendusseade
};

// STATS_IO=1 .env-is: iga päringu ette SET STATISTICS IO ON, ja logisse loetud lehekülgede arv.
// Vaikimisi väljas, sest see lisab igale päringule teateid, mida tavaliselt vaja ei ole.
const statsIo = process.env.STATS_IO === "1";

let pool;
try {
  pool = await sql.connect(config);
  console.log(`Ühendatud: ${config.server} / ${config.database}${statsIo ? " (STATISTICS IO sees)" : ""}`);
} catch (err) {
  console.error("Andmebaasiga ei saanud ühendust:", err.message);
  process.exit(1);
}

sql.on("error", (err) => console.error("MSSQL viga:", err.message));

// Ühe HTTP-päringu mõõdikud. server.js loob iga päringu jaoks uue ja query() liidab sinna juurde,
// ilma et neid peaks marsruutide kaudu edasi andma (AsyncLocalStorage).
export const timing = new AsyncLocalStorage();

// Täidab SQL-teksti ja tagastab tulemuse (result.recordset, result.recordsets)
export async function query(text) {
  const request = pool.request();
  let reads = 0;
  if (statsIo) {
    request.on("info", (msg) => {
      for (const m of msg.message.matchAll(/logical reads (\d+)/g)) reads += Number(m[1]);
    });
  }

  const t0 = performance.now();
  try {
    return await request.query(statsIo ? `SET STATISTICS IO ON;\n${text}` : text);
  } finally {
    const m = timing.getStore();
    if (m) {
      m.dbMs += performance.now() - t0;
      m.dbCalls += 1;
      m.reads += reads;
    }
  }
}

export { statsIo };
