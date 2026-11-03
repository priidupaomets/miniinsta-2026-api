# miniinsta-2026-api

An example REST API for the MiniInsta 2026 database, used for teaching database basics
(TalTech ICS0012 Database Basics, TLÜ IFI6106.DT Andmebaasid). Node.js, Express 5, ES modules.
It shows what an application does with a database: which queries a page needs, how many round
trips they take, and how long they run on a small and on a big database.

The database (schema and data for MS SQL Server, MySQL, PostgreSQL and SQLite) is in
[miniinsta-2026-db](https://github.com/priidupaomets/miniinsta-2026-db).

## What is here

| Folder | What it is |
|---|---|
| [`src/mssql/`](src/mssql/README.md) | The lecture versions for MS SQL Server, one folder per step: `01-express`, `02-database`, `03-endpoints`, `04-queries`, `05-benchmark`. Each step builds on the previous one and runs on its own. Comments and README in Estonian. |
| [`src/universal/`](src/universal/README.md) | The same steps (`01-express` … `05-benchmark`), but the database engine is chosen in `.env`: `DB_ENGINE=mssql`, `mysql`, `postgres` or `sqlite`. One adapter and one query file per engine, so the SQL dialect differences are visible side by side. Comments and messages in English. |
| `src/mssql/miniinsta-api-queries.sql` | All queries of the API with explanations, numbered as in `queries.js`. |

## Endpoints

`/api` lists them all. The main ones:

| Endpoint | |
|---|---|
| `GET /api/users`, `/api/users/:id`, `/api/users/:username` | users |
| `GET /api/frontpage` | posts of the followed users, with like count, media count and the first image |
| `GET /api/profile/:idOrUsername` | profile and the user's posts (two result sets) |
| `GET /api/posts/:id` | post, its images and comments (three result sets) |
| `GET /api/posts/:id/media?after=…` / `?before=…` | next / previous image of a post |
| `GET /api/stats`, `/api/stats/top10/followedusers`, `/api/stats/registrations`, `/api/stats/genderdivision` | statistics |

## Quick start

Requires Node.js 22.13 or later (`node --env-file`, `node --watch`, and `node:sqlite` for the
universal version) and a loaded MiniInsta 2026 database.

```
cd src/universal/05-benchmark # or src/mssql/05-benchmark
npm install
cp .env.example .env          # then fill in the engine, server and password
npm run dev                   # http://localhost:3000/api
npm run bench                 # in a second window: every endpoint 5 times
```

Every request writes one log line: total time, database time, number of round trips, and the
response size. With MS SQL and `STATS_IO=1` also the number of pages read:

```
GET /api/frontpage 200 7.9 ms | andmebaas 7.0 ms, 1 pöördumine, 636 lk | 4.6 KB
```

## Not in Git

`node_modules/`, `.env` (passwords) and local SQLite files (`*.db`) are ignored; `.env.example`
is committed.

## Planned

Later steps as the lectures get there (paging, parameters, stored procedures, caching) and an
Oracle adapter for the universal version (needs Oracle scripts in miniinsta-2026-db first).
