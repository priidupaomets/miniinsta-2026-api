import express from "express";
import { api } from "./routes.js";
import { timing, statsIo } from "./db.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "hbs");              // Handlebars: HTML-mallid kaustas views/

// Logi: iga päring ühe reana (8. loeng). Peab olema ENNE marsruute.
//   GET /api/frontpage 200 12.4 ms | andmebaas 10.9 ms, 1 pöördumine | 4.3 KB
// Kogu aeg = Express + andmebaas + JSON-i tegemine. Andmebaasi aja liidab db.js juurde.
app.use((req, res, next) => {
  const t0 = performance.now();
  const m = { dbMs: 0, dbCalls: 0, reads: 0 };

  res.on("finish", () => {                    // kui vastus on saadetud
    const ms = (performance.now() - t0).toFixed(1);
    const kb = (Number(res.getHeader("content-length") || 0) / 1024).toFixed(1);
    const db = m.dbCalls
      ? ` | andmebaas ${m.dbMs.toFixed(1)} ms, ${m.dbCalls} ${m.dbCalls === 1 ? "pöördumine" : "pöördumist"}` +
        (statsIo ? `, ${m.reads} lk` : "")
      : "";
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms} ms${db} | ${kb} KB`);
  });

  timing.run(m, next);                        // kõik, mis selle päringu jaoks tehakse, näeb m-i
});

app.get("/", (req, res) => res.send("<h1>Tere, MiniInsta!</h1>"));
app.use("/api", api);

// Viimane marsruut: midagi ei sobinud
app.use((req, res) => res.status(404).json({ error: "Sellist aadressi ei ole" }));

// Veakäsitleja (neli parameetrit). Express 5 saadab siia ka async-funktsioonide vead.
// NB! Veateksti saadame kliendile, et arendades oleks näha, mis juhtus.
// Kas see on mõistlik? Tuleme tagasi 12. loengus.
app.use((err, req, res, next) => {
  console.error(`${req.method} ${req.originalUrl}: ${err.message}`);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => console.log(`Kuulan pordil ${port}`));
