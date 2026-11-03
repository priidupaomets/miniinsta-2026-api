import { Router } from "express";
import * as db from "./db/index.js";

// The queries of the chosen engine: queries/<DB_ENGINE>.js
const { queries } = db;

export const api = Router();

const isId = (text) => /^\d+$/.test(text);

// The list of endpoints: the /api page is made from it (views/api-index.hbs)
const endpoints = [
  { method: "GET", url: "/api/health",                       info: "Does the chain browser → Node → database work", ready: true },
  { method: "GET", url: "/api/users",                        info: "All users",                         ready: true },
  { method: "GET", url: "/api/users/120",                    info: "User by ID",                        ready: true },
  { method: "GET", url: "/api/users/cbaccup3b",              info: "User by username",                  ready: true },
  { method: "GET", url: "/api/users/120/posts",              info: "Posts of a user",                   ready: true },
  { method: "GET", url: "/api/frontpage",                    info: "Front page: posts of followed users", ready: false },
  { method: "GET", url: "/api/profile/cbaccup3b",            info: "Profile and posts",                 ready: false },
  { method: "GET", url: "/api/posts/72",                     info: "Post, images and comments",         ready: false },
  { method: "GET", url: "/api/stats",                        info: "Overall numbers",                   ready: false },
  { method: "GET", url: "/api/stats/top10/followedusers",    info: "10 most followed users",            ready: false },
  { method: "GET", url: "/api/stats/registrations",          info: "Registrations by day",              ready: false },
  { method: "GET", url: "/api/stats/genderdivision",         info: "Users by gender",                   ready: false }
];

// Placeholder: the address exists, but does nothing yet
const placeholder = (name) => (req, res) =>
  res.status(501).json({ endpoint: name, info: "Placeholder, built later" });

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
  const sqlText = isId(id) ? queries.userById(id) : queries.userByUsername(id);

  const result = await db.query(sqlText);

  if (result.recordset.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(result.recordset[0]);
});

api.get("/users/:id/posts", async (req, res) => {
  const result = await db.query(queries.userPosts(req.params.id));
  res.json(result.recordset);
});

// --- The rest: placeholders
api.get("/frontpage",                  placeholder("frontpage"));
api.get("/profile/:id",                placeholder("profile"));
api.get("/posts/:id",                  placeholder("posts"));
api.get("/stats",                      placeholder("stats"));
api.get("/stats/top10/followedusers",  placeholder("top10followedusers"));
api.get("/stats/registrations",        placeholder("registrations"));
api.get("/stats/genderdivision",       placeholder("genderdivision"));
