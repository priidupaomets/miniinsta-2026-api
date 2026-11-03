import { Router } from "express";

export const api = Router();

// Kõik kasutajad. Andmebaasi veel ei ole, vastus on kohahoidja.
api.get("/users", (req, res) => {
  res.send("Kõik kasutajad (kohahoidja)");
});

// Üks kasutaja: :id on kas number või kasutajanimi.
// Express annab selle req.params.id all alati TEKSTINA.
api.get("/users/:id", (req, res) => {
  const id = req.params.id;

  if (/^\d+$/.test(id)) {
    res.send(`Kasutaja numbriga ${id} (kohahoidja)`);
  } else {
    res.send(`Kasutaja nimega ${id} (kohahoidja)`);
  }
});
