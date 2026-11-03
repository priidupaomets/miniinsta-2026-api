# MiniInsta API — universal version, step by step

The same steps as [`../mssql`](../mssql/README.md), but the database engine is chosen in `.env`:

```
DB_ENGINE=mssql | mysql | postgres | sqlite
```

One folder = one step. Every step builds on the previous one and runs on its own.

| Folder | What is new |
|---|---|
| `01-express` | Express, `/api/users` and `/api/users/:id` with placeholder text, `PORT` from an environment variable, `.env`. No database yet, so the same for every engine. |
| `02-database` | Connection to the chosen engine (`db/`), `/api/health`, users from the database (SQL as placeholders), placeholders for all other endpoints, the Handlebars page `/api` |
| `03-endpoints` | Front page, profile, post and four statistics: routes ready, SQL as placeholders |
| `04-queries` | All queries in `queries/<engine>.js`. Also: the front page returns `MediaID`, new `/api/posts/:id/media?after=…` / `?before=…` (next / previous image), `/api/users/:id/posts` also by username, TOP 10 with ties |
| `05-benchmark` | Measuring: one log line per request (total time, database time, number of round trips, response size), `STATS_IO=1` adds the pages read (MS SQL only), `npm run bench` calls every address several times |

Later steps (paging and so on) come as the lectures get there, in both versions.

## Values in the SQL text

As in the `mssql` version, the values from the address are put into the SQL text by concatenation:

```js
export const userByUsername = (username) => `SELECT * FROM … WHERE Username = '${username}'`;
```

That is deliberate (the comment says *NB!* in every query file); a later step comes back to it.

## How it is built

```
db/index.js          picks the adapter and the queries by DB_ENGINE; query(); measuring (05)
db/<engine>.js       connection and execution with that engine's driver; always returns { recordsets }
queries/<engine>.js  the same functions (frontpage, profile …) in that engine's SQL dialect
routes.js            the same for every engine: it does not know which engine is underneath
```

Every engine has its **own** query file, not one shared "universal SQL". That way the SQL of every
engine can be read exactly as it goes to the database, and the differences can be seen side by side.
A comment `MySQL:`, `PG:` or `SQLite:` marks where a dialect differs from MS SQL.

| Engine | Driver | Default port | Tested with |
|---|---|---|---|
| MS SQL Server | `mssql` | 1433 | SQL Server 2022 |
| MySQL 8 (8.0.14+) | `mysql2` | 3306 | MySQL 8.4 |
| PostgreSQL 13+ | `pg` | 5432 | PostgreSQL 17 |
| SQLite 3.25+ | `node:sqlite` (comes with Node) | – | Node 24.4 |

The database itself is in [miniinsta-2026-db](https://github.com/priidupaomets/miniinsta-2026-db)
(`src/regular/<engine>/`): the same schema and the same data for all four engines.

## Running

```
cd 05-benchmark               # or any other step
npm install
cp .env.example .env          # Windows: copy .env.example .env
# .env: DB_ENGINE, server, port, database, user, password
npm run dev                   # http://localhost:3000/api
npm run bench                 # (05) in a second window: every address 5 times
```

The log line shows the engine at start and the number of round trips per request:

```
Connected: postgres / localhost:5432 / miniinsta2026
GET /api/profile/120 200 3.8 ms | database 3.4 ms, 2 round trips | 2.9 KB
```

### SQLite

The database is a file. If `miniinsta-2026-db` is next to this repository (in the same folder), this
creates it:

```
npm run sqlite:create         # → ./MiniInsta2026.db (or DB_FILE from .env)
```

Another location: `node create-sqlite.js <path>/MiniInsta2026-SQLite.sql`. The `sqlite3` program
does the same: `sqlite3 MiniInsta2026.db < MiniInsta2026-SQLite.sql`.

### The big database

`DB_NAME=MiniInsta2026Big` (MS SQL, MySQL), `miniinsta2026big` (PostgreSQL) or
`DB_FILE=<path>/MiniInsta2026Big.db` (SQLite). How to get it for every engine:
[miniinsta-2026-db/docs](https://github.com/priidupaomets/miniinsta-2026-db/tree/main/docs).

## Engine differences that show up here

| Topic | MS SQL | MySQL | PostgreSQL | SQLite |
|---|---|---|---|---|
| The table `User` (a reserved word) | `[User]` | `` `User` `` | `"User"` | `"User"` |
| The first row | `TOP 1` | `LIMIT 1` | `LIMIT 1` | `LIMIT 1` |
| The first image on the front page | `OUTER APPLY` | `LEFT JOIN LATERAL … ON TRUE` | `LEFT JOIN LATERAL … ON TRUE` | `LEFT JOIN … ON ID = (SELECT MIN(ID) …)` |
| TOP 10 with ties | `TOP 10 WITH TIES` | `RANK() OVER (…) <= 10` | `FETCH FIRST 10 ROWS WITH TIES` | `RANK() OVER (…) <= 10` |
| Date from a timestamp | `CAST(x AS date)` | `DATE(x)` | `CAST(x AS date)` | `date(x)` |
| Database name | `DB_NAME()` | `DATABASE()` | `current_database()` | the file name |
| Upper and lower case in column names | as written | as written | **folded to lower case** unless in `"double quotes"` | as written |
| Date and time | `datetime2` | `DATETIME(6)` | `TIMESTAMP` | **text** |
| Several queries in one round trip | yes (profile 1, post 1) | one by one here (2, 3) | one by one here (2, 3) | one by one (2, 3) |
| Pages read in the log | `STATS_IO=1` | – | – | – |

To get **exactly the same** JSON from every engine:

- the PostgreSQL queries give every column an alias in double quotes (`AS "PostID"`) and list the
  columns instead of `SELECT *`; `db/postgres.js` turns the results of `COUNT` and `ROUND` into
  numbers (`pg` returns them as text by default) and reads `TIMESTAMP` as UTC;
- the SQLite queries format dates with `strftime` into the same ISO form (`2026-11-03T17:57:58.000Z`);
- the MySQL connection uses `timezone: "Z"` and `decimalNumbers: true`.

### MySQL: accented letters

The MySQL scripts in miniinsta-2026-db start with `SET NAMES utf8mb4;`, so accented letters are
stored correctly whatever the client's default character set is. An older copy of the script does
not have that line; then `ã` is stored double-encoded (`Ã£`) and the API passes it on. Load it like
this in that case:

```
mysql -u root -p --default-character-set=utf8mb4 < MiniInsta2026-MySQL.sql
```

## Compared with the mssql version

- The messages and comments are in English (the `mssql` version is in Estonian).
- A query that is still a placeholder (`-- PLACEHOLDER U2 …`) gives a clear error
  (`Query not written yet: -- PLACEHOLDER U2 …`) on every engine.
- Profile and post return their queries as an array. MS SQL still sends them in one round trip,
  the other engines one by one.
- `node:sqlite` is synchronous: while a query runs, Node serves no other request. That does not
  matter in development.

## Oracle

Not yet, because miniinsta-2026-db has no Oracle scripts. It would need:

1. `src/regular/Oracle/` scripts in the database repository (tables, data, verification).
2. `db/oracle.js` with the `oracledb` driver (Thin mode, no Instant Client needed).
3. `queries/oracle.js`. Oracle knows `OUTER APPLY` and `FETCH FIRST 10 ROWS WITH TIES` like
   MS SQL, but folds names without double quotes to **upper case**, so it needs aliases like
   PostgreSQL (`AS "PostID"`).
4. `"oracle"` in the list at the top of `db/index.js`.
