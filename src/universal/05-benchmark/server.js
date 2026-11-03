import express from "express";
import { api } from "./routes.js";
import { timing, statsIo } from "./db/index.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "hbs");              // Handlebars: HTML templates in the views/ folder

// Log: one line per request. Must come BEFORE the routes.
//   GET /api/frontpage 200 12.4 ms | database 10.9 ms, 1 round trip | 4.3 KB
// Total time = Express + database + making the JSON. db/index.js adds the database time.
app.use((req, res, next) => {
  const t0 = performance.now();
  const m = { dbMs: 0, dbCalls: 0, reads: 0 };

  res.on("finish", () => {                    // when the response has been sent
    const ms = (performance.now() - t0).toFixed(1);
    const kb = (Number(res.getHeader("content-length") || 0) / 1024).toFixed(1);
    const db = m.dbCalls
      ? ` | database ${m.dbMs.toFixed(1)} ms, ${m.dbCalls} ${m.dbCalls === 1 ? "round trip" : "round trips"}` +
        (statsIo ? `, ${m.reads} pages` : "")
      : "";
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms} ms${db} | ${kb} KB`);
  });

  timing.run(m, next);                        // everything done for this request sees m
});

app.get("/", (req, res) => res.send("<h1>Hello, MiniInsta!</h1>"));
app.use("/api", api);

// The last route: nothing matched
app.use((req, res) => res.status(404).json({ error: "No such address" }));

// Error handler (four parameters). Express 5 also sends the errors of async functions here.
// NB! The error text goes to the client, so that during development you can see what happened.
// Is that a good idea in production? Think about what it tells an attacker.
app.use((err, req, res, next) => {
  console.error(`${req.method} ${req.originalUrl}: ${err.message}`);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => console.log(`Listening on port ${port}`));
