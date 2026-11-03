// SQLite. ALL SQL of the API lives here; the other engines have the same functions in their own files.
// The numbers (H1, U1 …) are the same as in ../../mssql/miniinsta-api-queries.sql.
//
// STATUS: placeholders. The queries are written here after they have been reviewed. A query that is
// only a comment ("-- PLACEHOLDER …") gives an error that says which one is missing.
// The table of users is "User" (in double quotes).
// SQLite: date and time are text; format them as strftime('%Y-%m-%dT%H:%M:%fZ', column)
// to get the same JSON as the other engines.

export const health = () => "-- PLACEHOLDER H1: SELECT 1 AS ok, (SELECT file FROM pragma_database_list WHERE name = 'main') AS db";

// --- Users
export const usersAll = () =>
  "-- PLACEHOLDER U1: all users";

// NB! Values are put into the SQL text by concatenation. Simple, but NOT safe:
// we come back to this later.
export const userById = (id) =>
  `-- PLACEHOLDER U2: user by ID (ID = ${id})`;

export const userByUsername = (username) =>
  `-- PLACEHOLDER U3: user by username (Username = '${username}')`;

export const userPosts = (id) =>
  `-- PLACEHOLDER U5: posts of a user (UserID = ${id})`;

