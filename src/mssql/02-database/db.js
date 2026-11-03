import sql from "mssql";

const config = {
  server:   process.env.DB_SERVER || "localhost",
  port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,          // .env-ist, mitte siit
  options:  { encrypt: true, trustServerCertificate: true }   // arendusseade
};

// Üks ühenduste kogum (pool) kogu rakendusele. Server.js hakkab kuulama alles siis,
// kui see rida on valmis, sest import ootab top-level await'i ära.
let pool;
try {
  pool = await sql.connect(config);
  console.log(`Ühendatud: ${config.server} / ${config.database}`);
} catch (err) {
  console.error("Andmebaasiga ei saanud ühendust:", err.message);
  process.exit(1);
}

sql.on("error", (err) => console.error("MSSQL viga:", err.message));

// Täidab SQL-teksti ja tagastab tulemuse (result.recordset, result.recordsets)
export function query(text) {
  return pool.request().query(text);
}
