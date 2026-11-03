import express from "express";
import { api } from "./routes.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "hbs");              // Handlebars: HTML-mallid kaustas views/

app.get("/", (req, res) => res.send("<h1>Tere, MiniInsta!</h1>"));
app.use("/api", api);

// Viimane marsruut: midagi ei sobinud
app.use((req, res) => res.status(404).json({ error: "Sellist aadressi ei ole" }));

// Veakäsitleja (neli parameetrit). Express 5 saadab siia ka async-funktsioonide vead.
// NB! Veateksti saadame kliendile, et arendades oleks näha, mis juhtus.
// Kas see on mõistlik? Tuleme tagasi 12. loengus.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => console.log(`Kuulan pordil ${port}`));
