import { Router } from "express";
import * as db from "./db.js";
import * as queries from "./queries.js";

// Kuni sisselogimist ei ole, on esilehe kasutaja koodis kindel
const FRONTPAGE_USER = 152;

export const api = Router();

// Lõpp-punktide nimekiri: sellest tehakse /api leht (views/api-index.hbs)
const endpoints = [
  { method: "GET", url: "/api/health",                       info: "Kas ahel brauser → Node → andmebaas töötab", ready: true },
  { method: "GET", url: "/api/users",                        info: "Kõik kasutajad",                  ready: true },
  { method: "GET", url: "/api/users/120",                    info: "Kasutaja ID järgi",               ready: true },
  { method: "GET", url: "/api/users/cbaccup3b",              info: "Kasutaja kasutajanime järgi",     ready: true },
  { method: "GET", url: "/api/users/120/posts",              info: "Kasutaja postitused ID järgi",    ready: true },
  { method: "GET", url: "/api/users/sguys4/posts",           info: "Kasutaja postitused nime järgi",  ready: true },
  { method: "GET", url: "/api/frontpage",                    info: "Esileht: jälgitavate postitused", ready: true },
  { method: "GET", url: "/api/profile/cbaccup3b",            info: "Profiil ja postitused",           ready: true },
  { method: "GET", url: "/api/posts/72",                     info: "Postitus, pildid ja kommentaarid", ready: true },
  { method: "GET", url: "/api/posts/461/media?after=826",    info: "Järgmine pilt (esilehe nool →)",  ready: true },
  { method: "GET", url: "/api/posts/461/media?before=827",   info: "Eelmine pilt (nool ←)",           ready: true },
  { method: "GET", url: "/api/stats",                        info: "Üldarvud",                        ready: true },
  { method: "GET", url: "/api/stats/top10/followedusers",    info: "10 enim jälgitud kasutajat",      ready: true },
  { method: "GET", url: "/api/stats/registrations",          info: "Liitumised päevade kaupa",        ready: true },
  { method: "GET", url: "/api/stats/genderdivision",         info: "Kasutajad soo järgi",             ready: true }
];

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
  const sqlText = queries.isId(id) ? queries.userById(id) : queries.userByUsername(id);

  const result = await db.query(sqlText);

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: "Kasutajat ei leitud" });
  }
  res.json(result.recordset[0]);
});

// ID või kasutajanimi, nagu /users/:id
api.get("/users/:id/posts", async (req, res) => {
  const result = await db.query(queries.userPosts(req.params.id));
  res.json(result.recordset);
});

// --- Esileht
api.get("/frontpage", async (req, res) => {
  const result = await db.query(queries.frontpage(FRONTPAGE_USER));
  res.json(result.recordset);
});

// --- Profiil: üks pöördumine, kaks andmehulka (kasutaja ja tema postitused)
api.get("/profile/:id", async (req, res) => {
  const result = await db.query(queries.profile(req.params.id));
  const [profile, posts] = result.recordsets;

  if (profile.length === 0) {
    return res.status(404).json({ error: "Profiili ei leitud" });
  }
  res.json({ ...profile[0], posts });
});

// --- Postitus: üks pöördumine, kolm andmehulka
api.get("/posts/:id", async (req, res) => {
  const result = await db.query(queries.post(req.params.id));
  const [post, media, comments] = result.recordsets;

  if (post.length === 0) {
    return res.status(404).json({ error: "Postitust ei leitud" });
  }
  res.json({ ...post[0], media, comments });
});

// --- Pildid ükshaaval: ?after=826 annab järgmise, ?before=827 eelmise.
// Esileht tagastab ainult esimese pildi (MediaID) ja MediaCount-i, ülejäänud tulevad siit.
api.get("/posts/:id/media", async (req, res) => {
  const { after, before } = req.query;
  const mediaId = after ?? before;

  if (!queries.isId(req.params.id) || !queries.isId(mediaId ?? "")) {
    return res.status(400).json({ error: "Vaja on postituse ID-d ja ?after=<pildi ID> või ?before=<pildi ID>" });
  }

  const sqlText = after !== undefined
    ? queries.postMediaAfter(req.params.id, mediaId)
    : queries.postMediaBefore(req.params.id, mediaId);
  const result = await db.query(sqlText);

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: "Rohkem pilte ei ole" });
  }
  res.json(result.recordset[0]);
});

// --- Statistika
api.get("/stats", async (req, res) => {
  const result = await db.query(queries.stats());
  res.json(result.recordset[0]);
});

api.get("/stats/top10/followedusers", async (req, res) => {
  const result = await db.query(queries.top10FollowedUsers());
  res.json(result.recordset);
});

api.get("/stats/registrations", async (req, res) => {
  const result = await db.query(queries.registrations());
  res.json(result.recordset);
});

api.get("/stats/genderdivision", async (req, res) => {
  const result = await db.query(queries.genderDivision());
  res.json(result.recordset);
});
