import { Router } from "express";
import * as db from "./db.js";
import * as queries from "./queries.js";

export const api = Router();

const isId = (text) => /^\d+$/.test(text);

// Lõpp-punktide nimekiri: sellest tehakse /api leht (views/api-index.hbs)
const endpoints = [
  { method: "GET", url: "/api/health",                       info: "Kas ahel brauser → Node → andmebaas töötab", ready: true },
  { method: "GET", url: "/api/users",                        info: "Kõik kasutajad",                  ready: true },
  { method: "GET", url: "/api/users/120",                    info: "Kasutaja ID järgi",               ready: true },
  { method: "GET", url: "/api/users/cbaccup3b",              info: "Kasutaja kasutajanime järgi",     ready: true },
  { method: "GET", url: "/api/users/120/posts",              info: "Kasutaja postitused",             ready: true },
  { method: "GET", url: "/api/frontpage",                    info: "Esileht: jälgitavate postitused", ready: false },
  { method: "GET", url: "/api/profile/cbaccup3b",            info: "Profiil ja postitused",           ready: false },
  { method: "GET", url: "/api/posts/72",                     info: "Postitus, pildid ja kommentaarid", ready: false },
  { method: "GET", url: "/api/stats",                        info: "Üldarvud",                        ready: false },
  { method: "GET", url: "/api/stats/top10/followedusers",    info: "10 enim jälgitud kasutajat",      ready: false },
  { method: "GET", url: "/api/stats/registrations",          info: "Liitumised päevade kaupa",        ready: false },
  { method: "GET", url: "/api/stats/genderdivision",         info: "Kasutajad soo järgi",             ready: false }
];

// Kohahoidja: aadress on olemas, aga midagi ei tee veel
const placeholder = (name) => (req, res) =>
  res.status(501).json({ endpoint: name, info: "Kohahoidja, ehitame hiljem" });

// --- /api: lõpp-punktide leht (Handlebars)
api.get("/", (req, res) => {
  res.render("api-index", { title: "MiniInsta API", endpoints });
});

// --- Esimene päring andmebaasi
api.get("/health", async (req, res) => {
  const result = await db.query(queries.health);
  res.json(result.recordset[0]);
});

// --- Kasutajad
api.get("/users", async (req, res) => {
  const result = await db.query(queries.usersAll());
  res.json(result.recordset);
});

api.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const sqlText = isId(id) ? queries.userById(id) : queries.userByUsername(id);

  const result = await db.query(sqlText);

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: "Kasutajat ei leitud" });
  }
  res.json(result.recordset[0]);
});

api.get("/users/:id/posts", async (req, res) => {
  const result = await db.query(queries.userPosts(req.params.id));
  res.json(result.recordset);
});

// --- Ülejäänud: kohahoidjad
api.get("/frontpage",                  placeholder("frontpage"));
api.get("/profile/:id",                placeholder("profile"));
api.get("/posts/:id",                  placeholder("posts"));
api.get("/stats",                      placeholder("stats"));
api.get("/stats/top10/followedusers",  placeholder("top10followedusers"));
api.get("/stats/registrations",        placeholder("registrations"));
api.get("/stats/genderdivision",       placeholder("genderdivision"));
