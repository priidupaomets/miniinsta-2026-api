// MS SQL Server (T-SQL). ALL SQL of the API lives here; the other engines have the same functions in their own files.
// The numbers (H1, U1 …) are the same as in ../../mssql/miniinsta-api-queries.sql.
//
// STATUS: placeholders. The queries are written here after they have been reviewed. A query that is
// only a comment ("-- PLACEHOLDER …") gives an error that says which one is missing.
// The table of users is dbo.[User].

export const isId = (text) => /^\d+$/.test(text);

export const health = () => "-- PLACEHOLDER H1: SELECT 1 AS ok, DB_NAME() AS db";

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

// --- Front page
export const frontpage = (userId) =>
  `-- PLACEHOLDER F1: front page (FollowerUserID = ${userId})`;

// --- Profile: TWO queries (P1 and P2), two result sets: return them as an array [p1, p2].
// The condition is either `U.ID = …` or `U.Username = '…'`.
export const profile = (idOrUsername) => {
  const condition = isId(idOrUsername)
    ? `U.ID = ${idOrUsername}`
    : `U.Username = '${idOrUsername}'`;

  return `-- PLACEHOLDER P1 + P2: profile and posts (WHERE ${condition})`;
};

// --- Post: THREE queries (S1, S2, S3), three result sets: an array [s1, s2, s3]
export const post = (postId) =>
  `-- PLACEHOLDER S1 + S2 + S3: post, media, comments (PostID = ${postId})`;

// --- Statistics
export const stats = () =>
  "-- PLACEHOLDER T1: overall numbers";

export const top10FollowedUsers = () =>
  "-- PLACEHOLDER T2: the 10 most followed users";

export const registrations = () =>
  "-- PLACEHOLDER T3: registrations by day";

export const genderDivision = () =>
  "-- PLACEHOLDER T4: users by gender";
