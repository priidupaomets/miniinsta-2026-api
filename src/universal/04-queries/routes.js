import { Router } from "express";
import * as db from "./db/index.js";

// The queries of the chosen engine: queries/<DB_ENGINE>.js
const { queries } = db;

// Until there is a login, the front page user is fixed in the code
const FRONTPAGE_USER = 152;

export const api = Router();

// The list of endpoints: the /api page is made from it (views/api-index.hbs)
const endpoints = [
  { method: "GET", url: "/api/health",                       info: "Does the chain browser → Node → database work", ready: true },
  { method: "GET", url: "/api/users",                        info: "All users",                         ready: true },
  { method: "GET", url: "/api/users/120",                    info: "User by ID",                        ready: true },
  { method: "GET", url: "/api/users/cbaccup3b",              info: "User by username",                  ready: true },
  { method: "GET", url: "/api/users/120/posts",              info: "Posts of a user by ID",             ready: true },
  { method: "GET", url: "/api/users/sguys4/posts",           info: "Posts of a user by username",       ready: true },
  { method: "GET", url: "/api/frontpage",                    info: "Front page: posts of followed users", ready: true },
  { method: "GET", url: "/api/profile/cbaccup3b",            info: "Profile and posts",                 ready: true },
  { method: "GET", url: "/api/posts/72",                     info: "Post, images and comments",         ready: true },
  { method: "GET", url: "/api/posts/461/media?after=826",    info: "Next image (front page arrow →)",   ready: true },
  { method: "GET", url: "/api/posts/461/media?before=827",   info: "Previous image (arrow ←)",          ready: true },
  { method: "GET", url: "/api/stats",                        info: "Overall numbers",                   ready: true },
  { method: "GET", url: "/api/stats/top10/followedusers",    info: "10 most followed users",            ready: true },
  { method: "GET", url: "/api/stats/registrations",          info: "Registrations by day",              ready: true },
  { method: "GET", url: "/api/stats/genderdivision",         info: "Users by gender",                   ready: true }
];

// --- /api: the list of endpoints (Handlebars)
api.get("/", (req, res) => {
  res.render("api-index", { title: `MiniInsta API (${db.engine})`, endpoints });
});

// --- The first query to the database
api.get("/health", async (req, res) => {
  const result = await db.query(queries.health());
  res.json(result.recordset[0]);
});

// --- Users
api.get("/users", async (req, res) => {
  const result = await db.query(queries.usersAll());
  res.json(result.recordset);
});

api.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const sqlText = queries.isId(id) ? queries.userById(id) : queries.userByUsername(id);

  const result = await db.query(sqlText);

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(result.recordset[0]);
});

// By ID or by username, as /users/:id
api.get("/users/:id/posts", async (req, res) => {
  const result = await db.query(queries.userPosts(req.params.id));
  res.json(result.recordset);
});

// --- Front page
api.get("/frontpage", async (req, res) => {
  const result = await db.query(queries.frontpage(FRONTPAGE_USER));
  res.json(result.recordset);
});

// --- Profile: two result sets (the user and the user's posts)
api.get("/profile/:id", async (req, res) => {
  const result = await db.query(queries.profile(req.params.id));
  const [profile, posts] = result.recordsets;

  if (profile.length === 0) {
    return res.status(404).json({ error: "Profile not found" });
  }
  res.json({ ...profile[0], posts });
});

// --- Post: three result sets
api.get("/posts/:id", async (req, res) => {
  const result = await db.query(queries.post(req.params.id));
  const [post, media, comments] = result.recordsets;

  if (post.length === 0) {
    return res.status(404).json({ error: "Post not found" });
  }
  res.json({ ...post[0], media, comments });
});

// --- Images one at a time: ?after=826 gives the next one, ?before=827 the previous one.
// The front page returns only the first image (MediaID) and MediaCount, the others come from here.
api.get("/posts/:id/media", async (req, res) => {
  const { after, before } = req.query;
  const mediaId = after ?? before;

  if (!queries.isId(req.params.id) || !queries.isId(mediaId ?? "")) {
    return res.status(400).json({ error: "Needs a post ID and ?after=<media ID> or ?before=<media ID>" });
  }

  const sqlText = after !== undefined
    ? queries.postMediaAfter(req.params.id, mediaId)
    : queries.postMediaBefore(req.params.id, mediaId);
  const result = await db.query(sqlText);

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: "No more images" });
  }
  res.json(result.recordset[0]);
});

// --- Statistics
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
