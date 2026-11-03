// SQLite (3.25+). The same queries as queries/mssql.js; the places where the dialect differs are marked SQLite:.
//
// SQLite: date and time are text ('2026-11-03 17:57:58'). To get the same JSON as the other engines
// ('2026-11-03T17:57:58.000Z'), iso() formats them in the query.

export const isId = (text) => /^\d+$/.test(text);

const iso = (column) => `strftime('%Y-%m-%dT%H:%M:%fZ', ${column})`;

// NB! Values are put into the SQL text by concatenation. Simple, but NOT safe:
// we come back to this later.
const userCondition = (idOrUsername) =>
  isId(idOrUsername) ? `U.ID = ${idOrUsername}` : `U.Username = '${idOrUsername}'`;

// U1–U3: a list of columns instead of SELECT *, so that JoinedAt has the same format
const userColumns = `ID, Username, FullName, ProfilePictureUrl, Website, Bio,
       Password, Email, Phone, GenderID, ${iso("JoinedAt")} AS JoinedAt`;

// H1. SQLite: there is no database name, there is a file
export const health = () => `
SELECT 1 AS ok, (SELECT file FROM pragma_database_list WHERE name = 'main') AS db`;

// --- Users. SQLite: "User" in double quotes, no dbo schema
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
SELECT Post.ID, Post.Caption, ${iso("Post.CreatedAt")} AS CreatedAt
  FROM Post
       INNER JOIN "User" AS U ON Post.UserID = U.ID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC`;

// --- Front page. SQLite: no OUTER APPLY and no LATERAL. The first image is found with an
// ordinary LEFT JOIN on the ID that the subquery MIN(ID) returns.
export const frontpage = (userId) => `
SELECT Post.ID            AS PostID,
       U.ID               AS UserID,
       U.Username,
       Post.Caption,
       ${iso("Post.CreatedAt")} AS CreatedAt,
       COUNT(Liking.UserID) AS LikeCount,
       (SELECT COUNT(*) FROM PostMedia WHERE PostMedia.PostID = Post.ID) AS MediaCount,
       PM.ID              AS MediaID,
       PM.MediaTypeID,
       PM.MediaFileUrl
  FROM Post
       INNER JOIN "User" AS U          ON Post.UserID = U.ID
       INNER JOIN Following            ON Post.UserID = Following.FollowedUserID
       LEFT OUTER JOIN Liking          ON Post.ID = Liking.PostID
       LEFT OUTER JOIN PostMedia AS PM ON PM.ID = (SELECT MIN(ID) FROM PostMedia
                                                    WHERE PostMedia.PostID = Post.ID)
 WHERE Following.FollowerUserID = ${userId}
 GROUP BY Post.ID, U.ID, U.Username, Post.Caption, Post.CreatedAt,
          PM.ID, PM.MediaTypeID, PM.MediaFileUrl
 ORDER BY Post.CreatedAt DESC, Post.ID DESC`;

// --- Profile: two queries, two round trips
export const profile = (idOrUsername) => [`
SELECT U.ID, U.Username, U.FullName, U.ProfilePictureUrl, U.Website, U.Bio,
       (SELECT COUNT(*) FROM Post      WHERE Post.UserID = U.ID)             AS PostCount,
       (SELECT COUNT(*) FROM Following WHERE Following.FollowedUserID = U.ID) AS FollowerCount,
       (SELECT COUNT(*) FROM Following WHERE Following.FollowerUserID = U.ID) AS FollowingCount
  FROM "User" AS U
 WHERE ${userCondition(idOrUsername)}`, `
SELECT Post.ID, Post.Caption, ${iso("Post.CreatedAt")} AS CreatedAt,
       PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM Post
       INNER JOIN "User" AS U         ON Post.UserID = U.ID
       LEFT OUTER JOIN PostMedia      ON Post.ID = PostMedia.PostID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC, PostMedia.ID`];

// --- Post: three queries, three round trips
export const post = (postId) => [`
SELECT Post.ID, "User".Username, "User".ProfilePictureUrl, Post.Caption,
       ${iso("Post.CreatedAt")} AS CreatedAt,
       (SELECT COUNT(*) FROM Liking WHERE Liking.PostID = Post.ID) AS Likes
  FROM Post
       INNER JOIN "User" ON Post.UserID = "User".ID
 WHERE Post.ID = ${postId}`, `
SELECT PostMedia.ID, PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM PostMedia
 WHERE PostMedia.PostID = ${postId}
 ORDER BY PostMedia.ID`, `
SELECT Comment.ID AS CommentID, "User".Username, Comment.Content,
       ${iso("Comment.CreatedAt")} AS CreatedAt
  FROM Comment
       INNER JOIN "User" ON Comment.UserID = "User".ID
 WHERE Comment.PostID = ${postId}
 ORDER BY Comment.CreatedAt, Comment.ID`];

// SQLite: LIMIT 1 at the end instead of TOP 1
export const postMediaAfter = (postId, mediaId) => `
SELECT ID AS MediaID, MediaTypeID, MediaFileUrl
  FROM PostMedia
 WHERE PostID = ${postId}
   AND ID > ${mediaId}
 ORDER BY ID
 LIMIT 1`;

export const postMediaBefore = (postId, mediaId) => `
SELECT ID AS MediaID, MediaTypeID, MediaFileUrl
  FROM PostMedia
 WHERE PostID = ${postId}
   AND ID < ${mediaId}
 ORDER BY ID DESC
 LIMIT 1`;

// --- Statistics
export const stats = () => `
SELECT (SELECT COUNT(*) FROM "User") AS UserCount,
       (SELECT COUNT(*) FROM Post)   AS PostCount,
       (SELECT ROUND(AVG(1.0 * PostCount), 2)
          FROM (SELECT UserID, COUNT(*) AS PostCount FROM Post GROUP BY UserID) AS PostsPerUser)
         AS AvgPostsPerUser,
       (SELECT MAX(PostCount)
          FROM (SELECT UserID, COUNT(*) AS PostCount FROM Post GROUP BY UserID) AS PostsPerUser)
         AS MaxPostsPerUser,
       (SELECT ROUND(AVG(1.0 * CommentCount), 2)
          FROM (SELECT PostID, COUNT(*) AS CommentCount FROM Comment GROUP BY PostID) AS CommentsPerPost)
         AS AvgCommentsPerPost,
       (SELECT MAX(CommentCount)
          FROM (SELECT PostID, COUNT(*) AS CommentCount FROM Comment GROUP BY PostID) AS CommentsPerPost)
         AS MaxCommentsPerPost,
       (SELECT ROUND(AVG(1.0 * LikeCount), 2)
          FROM (SELECT PostID, COUNT(*) AS LikeCount FROM Liking GROUP BY PostID) AS LikesPerPost)
         AS AvgLikesPerPost,
       (SELECT MAX(LikeCount)
          FROM (SELECT PostID, COUNT(*) AS LikeCount FROM Liking GROUP BY PostID) AS LikesPerPost)
         AS MaxLikesPerPost`;

// T2. SQLite: no WITH TIES; the window function RANK() gives the ties
export const top10FollowedUsers = () => `
SELECT ID, Username, FollowerCount
  FROM (SELECT U.ID, U.Username, COUNT(Following.FollowedUserID) AS FollowerCount,
               RANK() OVER (ORDER BY COUNT(Following.FollowedUserID) DESC) AS Place
          FROM "User" AS U
               LEFT OUTER JOIN Following ON U.ID = Following.FollowedUserID
         GROUP BY U.ID, U.Username) AS Ranked
 WHERE Place <= 10
 ORDER BY FollowerCount DESC`;

// T3. SQLite: date(…) instead of CAST(… AS date); midnight UTC, as in the other engines
export const registrations = () => `
SELECT date(JoinedAt) || 'T00:00:00.000Z' AS Date, COUNT(ID) AS UserCount
  FROM "User"
 GROUP BY date(JoinedAt)
 ORDER BY date(JoinedAt)`;

export const genderDivision = () => `
SELECT Gender.Name AS Gender, COUNT("User".ID) AS UserCount
  FROM "User"
       INNER JOIN Gender ON "User".GenderID = Gender.ID
 GROUP BY Gender.Name
 ORDER BY UserCount DESC, Gender.Name`;
