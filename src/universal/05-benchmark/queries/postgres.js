// PostgreSQL. The same queries as queries/mssql.js; the places where the dialect differs are marked PG:.
//
// PG: names without double quotes are folded to lower case (Post.ID comes back as "id"). To get the
// same JSON keys as the other engines, every output column has an alias in double quotes: AS "PostID".
// For the same reason there is no SELECT * here, but a list of columns.

export const isId = (text) => /^\d+$/.test(text);

// NB! Values are put into the SQL text by concatenation. Simple, but NOT safe:
// we come back to this later.
const userCondition = (idOrUsername) =>
  isId(idOrUsername) ? `U.ID = ${idOrUsername}` : `U.Username = '${idOrUsername}'`;

// U1–U3: every column of "User", in the same order and with the same names as SELECT * in MS SQL
const userColumns = `ID AS "ID", Username AS "Username", FullName AS "FullName",
       ProfilePictureUrl AS "ProfilePictureUrl", Website AS "Website", Bio AS "Bio",
       Password AS "Password", Email AS "Email", Phone AS "Phone",
       GenderID AS "GenderID", JoinedAt AS "JoinedAt"`;

// H1. PG: current_database()
export const health = () => `SELECT 1 AS "ok", current_database() AS "db"`;

// --- Users. PG: "User" in double quotes (a reserved word), no dbo schema
export const usersAll = () => `
SELECT ${userColumns}
  FROM "User"
 ORDER BY ID`;

export const userById = (id) => `
SELECT ${userColumns}
  FROM "User"
 WHERE ID = ${id}`;

export const userByUsername = (username) => `
SELECT ${userColumns}
  FROM "User"
 WHERE Username = '${username}'`;

export const userPosts = (idOrUsername) => `
SELECT Post.ID AS "ID", Post.Caption AS "Caption", Post.CreatedAt AS "CreatedAt"
  FROM Post
       INNER JOIN "User" AS U ON Post.UserID = U.ID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC`;

// --- Front page. PG: LEFT JOIN LATERAL … ON TRUE instead of OUTER APPLY, LIMIT 1 instead of TOP 1
export const frontpage = (userId) => `
SELECT Post.ID            AS "PostID",
       U.ID               AS "UserID",
       U.Username         AS "Username",
       Post.Caption       AS "Caption",
       Post.CreatedAt     AS "CreatedAt",
       COUNT(Liking.UserID) AS "LikeCount",
       (SELECT COUNT(*) FROM PostMedia WHERE PostMedia.PostID = Post.ID) AS "MediaCount",
       PM.ID              AS "MediaID",
       PM.MediaTypeID     AS "MediaTypeID",
       PM.MediaFileUrl    AS "MediaFileUrl"
  FROM Post
       INNER JOIN "User" AS U          ON Post.UserID = U.ID
       INNER JOIN Following            ON Post.UserID = Following.FollowedUserID
       LEFT OUTER JOIN Liking          ON Post.ID = Liking.PostID
       LEFT JOIN LATERAL (SELECT ID, MediaTypeID, MediaFileUrl
                            FROM PostMedia
                           WHERE PostMedia.PostID = Post.ID
                           ORDER BY PostMedia.ID
                           LIMIT 1) AS PM ON TRUE
 WHERE Following.FollowerUserID = ${userId}
 GROUP BY Post.ID, U.ID, U.Username, Post.Caption, Post.CreatedAt,
          PM.ID, PM.MediaTypeID, PM.MediaFileUrl
 ORDER BY Post.CreatedAt DESC, Post.ID DESC`;

// --- Profile: two queries, in PG two round trips
export const profile = (idOrUsername) => [`
SELECT U.ID AS "ID", U.Username AS "Username", U.FullName AS "FullName",
       U.ProfilePictureUrl AS "ProfilePictureUrl", U.Website AS "Website", U.Bio AS "Bio",
       (SELECT COUNT(*) FROM Post      WHERE Post.UserID = U.ID)             AS "PostCount",
       (SELECT COUNT(*) FROM Following WHERE Following.FollowedUserID = U.ID) AS "FollowerCount",
       (SELECT COUNT(*) FROM Following WHERE Following.FollowerUserID = U.ID) AS "FollowingCount"
  FROM "User" AS U
 WHERE ${userCondition(idOrUsername)}`, `
SELECT Post.ID AS "ID", Post.Caption AS "Caption", Post.CreatedAt AS "CreatedAt",
       PostMedia.MediaTypeID AS "MediaTypeID", PostMedia.MediaFileUrl AS "MediaFileUrl"
  FROM Post
       INNER JOIN "User" AS U         ON Post.UserID = U.ID
       LEFT OUTER JOIN PostMedia      ON Post.ID = PostMedia.PostID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC, PostMedia.ID`];

// --- Post: three queries, three round trips
export const post = (postId) => [`
SELECT Post.ID AS "ID", "User".Username AS "Username", "User".ProfilePictureUrl AS "ProfilePictureUrl",
       Post.Caption AS "Caption", Post.CreatedAt AS "CreatedAt",
       (SELECT COUNT(*) FROM Liking WHERE Liking.PostID = Post.ID) AS "Likes"
  FROM Post
       INNER JOIN "User" ON Post.UserID = "User".ID
 WHERE Post.ID = ${postId}`, `
SELECT PostMedia.ID AS "ID", PostMedia.MediaTypeID AS "MediaTypeID", PostMedia.MediaFileUrl AS "MediaFileUrl"
  FROM PostMedia
 WHERE PostMedia.PostID = ${postId}
 ORDER BY PostMedia.ID`, `
SELECT Comment.ID AS "CommentID", "User".Username AS "Username",
       Comment.Content AS "Content", Comment.CreatedAt AS "CreatedAt"
  FROM Comment
       INNER JOIN "User" ON Comment.UserID = "User".ID
 WHERE Comment.PostID = ${postId}
 ORDER BY Comment.CreatedAt, Comment.ID`];

// PG: LIMIT 1 at the end instead of TOP 1
export const postMediaAfter = (postId, mediaId) => `
SELECT ID AS "MediaID", MediaTypeID AS "MediaTypeID", MediaFileUrl AS "MediaFileUrl"
  FROM PostMedia
 WHERE PostID = ${postId}
   AND ID > ${mediaId}
 ORDER BY ID
 LIMIT 1`;

export const postMediaBefore = (postId, mediaId) => `
SELECT ID AS "MediaID", MediaTypeID AS "MediaTypeID", MediaFileUrl AS "MediaFileUrl"
  FROM PostMedia
 WHERE PostID = ${postId}
   AND ID < ${mediaId}
 ORDER BY ID DESC
 LIMIT 1`;

// --- Statistics
export const stats = () => `
SELECT (SELECT COUNT(*) FROM "User") AS "UserCount",
       (SELECT COUNT(*) FROM Post)   AS "PostCount",
       (SELECT ROUND(AVG(1.0 * PostCount), 2)
          FROM (SELECT UserID, COUNT(*) AS PostCount FROM Post GROUP BY UserID) AS PostsPerUser)
         AS "AvgPostsPerUser",
       (SELECT MAX(PostCount)
          FROM (SELECT UserID, COUNT(*) AS PostCount FROM Post GROUP BY UserID) AS PostsPerUser)
         AS "MaxPostsPerUser",
       (SELECT ROUND(AVG(1.0 * CommentCount), 2)
          FROM (SELECT PostID, COUNT(*) AS CommentCount FROM Comment GROUP BY PostID) AS CommentsPerPost)
         AS "AvgCommentsPerPost",
       (SELECT MAX(CommentCount)
          FROM (SELECT PostID, COUNT(*) AS CommentCount FROM Comment GROUP BY PostID) AS CommentsPerPost)
         AS "MaxCommentsPerPost",
       (SELECT ROUND(AVG(1.0 * LikeCount), 2)
          FROM (SELECT PostID, COUNT(*) AS LikeCount FROM Liking GROUP BY PostID) AS LikesPerPost)
         AS "AvgLikesPerPost",
       (SELECT MAX(LikeCount)
          FROM (SELECT PostID, COUNT(*) AS LikeCount FROM Liking GROUP BY PostID) AS LikesPerPost)
         AS "MaxLikesPerPost"`;

// T2. PG (13+): FETCH FIRST 10 ROWS WITH TIES at the end instead of TOP 10 WITH TIES
export const top10FollowedUsers = () => `
SELECT "User".ID AS "ID", "User".Username AS "Username",
       COUNT(Following.FollowedUserID) AS "FollowerCount"
  FROM "User"
       LEFT OUTER JOIN Following ON "User".ID = Following.FollowedUserID
 GROUP BY "User".ID, "User".Username
 ORDER BY "FollowerCount" DESC
 FETCH FIRST 10 ROWS WITH TIES`;

export const registrations = () => `
SELECT CAST(JoinedAt AS date) AS "Date", COUNT(ID) AS "UserCount"
  FROM "User"
 GROUP BY CAST(JoinedAt AS date)
 ORDER BY "Date"`;

export const genderDivision = () => `
SELECT Gender.Name AS "Gender", COUNT("User".ID) AS "UserCount"
  FROM "User"
       INNER JOIN Gender ON "User".GenderID = Gender.ID
 GROUP BY Gender.Name
 ORDER BY "UserCount" DESC, Gender.Name`;
