import express from "express";
import { api } from "./routes.js";

const app = express();
const port = process.env.PORT || 3000;      // keskkonnamuutujast, kui seda ei ole, siis 3000

app.get("/", (req, res) => res.send("<h1>Tere, MiniInsta!</h1>"));
app.use("/api", api);                       // kõik /api/… läheb routes.js-i

// Viimane: midagi ei sobinud
app.use((req, res) => res.status(404).json({ error: "Sellist aadressi ei ole" }));

app.listen(port, () => console.log(`Kuulan pordil ${port}`));
