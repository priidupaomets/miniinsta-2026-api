// MS SQL Server (T-SQL). ALL SQL of the API lives here; the other engines have the same functions
// in mysql.js, postgres.js and sqlite.js. The numbers (H1, U1 …) are the same as in
// ../../mssql/miniinsta-api-queries.sql, which explains every query.
//
// A function returns one SQL text, or an array of texts when a page needs several result sets.

export const isId = (text) => /^\d+$/.test(text);

// NB! Values are put into the SQL text by concatenation. Simple, but NOT safe:
// we come back to this later.
const userCondition = (idOrUsername) =>
  isId(idOrUsername) ? `U.ID = ${idOrUsername}` : `U.Username = '${idOrUsername}'`;

// H1
export const health = () => "SELECT 1 AS ok, DB_NAME() AS db";

// --- Users
// U1 (SELECT * on purpose: see what the API sends to the client)
export const usersAll = () => `
SELECT *
  FROM dbo.[User]
 ORDER BY ID`;

// U2
export const userById = (id) => `
SELECT *
  FROM dbo.[User]
 WHERE ID = ${id}`;

// U3
export const userByUsername = (username) => `
SELECT *
  FROM dbo.[User]
 WHERE Username = '${username}'`;

// U5: by ID or by username
export const userPosts = (idOrUsername) => `
SELECT Post.ID, Post.Caption, Post.CreatedAt
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U ON Post.UserID = U.ID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC`;

// --- Front page
// F1: posts of the followed users, like count, media count and the first image (OUTER APPLY)
export const frontpage = (userId) => `
SELECT Post.ID            AS PostID,
       U.ID               AS UserID,
       U.Username,
       Post.Caption,
       Post.CreatedAt,
       COUNT(Liking.UserID) AS LikeCount,
       (SELECT COUNT(*) FROM dbo.PostMedia WHERE PostMedia.PostID = Post.ID) AS MediaCount,
       PM.ID              AS MediaID,
       PM.MediaTypeID,
       PM.MediaFileUrl
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U      ON Post.UserID = U.ID
       INNER JOIN dbo.Following        ON Post.UserID = Following.FollowedUserID
       LEFT OUTER JOIN dbo.Liking      ON Post.ID = Liking.PostID
       OUTER APPLY (SELECT TOP 1 ID, MediaTypeID, MediaFileUrl
                      FROM dbo.PostMedia
                     WHERE PostMedia.PostID = Post.ID
                     ORDER BY PostMedia.ID) AS PM
 WHERE Following.FollowerUserID = ${userId}
 GROUP BY Post.ID, U.ID, U.Username, Post.Caption, Post.CreatedAt,
          PM.ID, PM.MediaTypeID, PM.MediaFileUrl
 ORDER BY Post.CreatedAt DESC, Post.ID DESC`;

// --- Profile: TWO queries (P1 and P2), two result sets. MS SQL sends both in one round trip.
export const profile = (idOrUsername) => [`
SELECT U.ID, U.Username, U.FullName, U.ProfilePictureUrl, U.Website, U.Bio,
       (SELECT COUNT(*) FROM dbo.Post      WHERE Post.UserID = U.ID)             AS PostCount,
       (SELECT COUNT(*) FROM dbo.Following WHERE Following.FollowedUserID = U.ID) AS FollowerCount,
       (SELECT COUNT(*) FROM dbo.Following WHERE Following.FollowerUserID = U.ID) AS FollowingCount
  FROM dbo.[User] AS U
 WHERE ${userCondition(idOrUsername)}`, `
SELECT Post.ID, Post.Caption, Post.CreatedAt,
       PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U         ON Post.UserID = U.ID
       LEFT OUTER JOIN dbo.PostMedia      ON Post.ID = PostMedia.PostID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC, PostMedia.ID`];

// --- Post: THREE queries (S1, S2, S3), three result sets
export const post = (postId) => [`
SELECT Post.ID, [User].Username, [User].ProfilePictureUrl, Post.Caption, Post.CreatedAt,
       (SELECT COUNT(*) FROM dbo.Liking WHERE Liking.PostID = Post.ID) AS Likes
  FROM dbo.Post
       INNER JOIN dbo.[User] ON Post.UserID = [User].ID
 WHERE Post.ID = ${postId}`, `
SELECT PostMedia.ID, PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM dbo.PostMedia
 WHERE PostMedia.PostID = ${postId}
 ORDER BY PostMedia.ID`, `
SELECT Comment.ID AS CommentID, [User].Username, Comment.Content, Comment.CreatedAt
  FROM dbo.Comment
       INNER JOIN dbo.[User] ON Comment.UserID = [User].ID
 WHERE Comment.PostID = ${postId}
 ORDER BY Comment.CreatedAt, Comment.ID`];

// M1: the next (after) or previous (before) image of the same post
export const postMediaAfter = (postId, mediaId) => `
SELECT TOP 1 ID AS MediaID, MediaTypeID, MediaFileUrl
  FROM dbo.PostMedia
 WHERE PostID = ${postId}
   AND ID > ${mediaId}
 ORDER BY ID`;

export const postMediaBefore = (postId, mediaId) => `
SELECT TOP 1 ID AS MediaID, MediaTypeID, MediaFileUrl
  FROM dbo.PostMedia
 WHERE PostID = ${postId}
   AND ID < ${mediaId}
 ORDER BY ID DESC`;

// --- Statistics
// T1: overall numbers in one row
export const stats = () => `
SELECT (SELECT COUNT(*) FROM dbo.[User]) AS UserCount,
       (SELECT COUNT(*) FROM dbo.Post)   AS PostCount,
       (SELECT ROUND(AVG(1.0 * PostCount), 2)
          FROM (SELECT UserID, COUNT(*) AS PostCount FROM dbo.Post GROUP BY UserID) AS PostsPerUser)
         AS AvgPostsPerUser,
       (SELECT MAX(PostCount)
          FROM (SELECT UserID, COUNT(*) AS PostCount FROM dbo.Post GROUP BY UserID) AS PostsPerUser)
         AS MaxPostsPerUser,
       (SELECT ROUND(AVG(1.0 * CommentCount), 2)
          FROM (SELECT PostID, COUNT(*) AS CommentCount FROM dbo.Comment GROUP BY PostID) AS CommentsPerPost)
         AS AvgCommentsPerPost,
       (SELECT MAX(CommentCount)
          FROM (SELECT PostID, COUNT(*) AS CommentCount FROM dbo.Comment GROUP BY PostID) AS CommentsPerPost)
         AS MaxCommentsPerPost,
       (SELECT ROUND(AVG(1.0 * LikeCount), 2)
          FROM (SELECT PostID, COUNT(*) AS LikeCount FROM dbo.Liking GROUP BY PostID) AS LikesPerPost)
         AS AvgLikesPerPost,
       (SELECT MAX(LikeCount)
          FROM (SELECT PostID, COUNT(*) AS LikeCount FROM dbo.Liking GROUP BY PostID) AS LikesPerPost)
         AS MaxLikesPerPost`;

// T2: the 10 most followed users, with ties (ORDER BY only FollowerCount, otherwise no ties)
export const top10FollowedUsers = () => `
SELECT TOP 10 WITH TIES
       [User].ID, [User].Username, COUNT(Following.FollowedUserID) AS FollowerCount
  FROM dbo.[User]
       LEFT OUTER JOIN dbo.Following ON [User].ID = Following.FollowedUserID
 GROUP BY [User].ID, [User].Username
 ORDER BY FollowerCount DESC`;

// T3
export const registrations = () => `
SELECT CAST(JoinedAt AS date) AS [Date], COUNT(ID) AS UserCount
  FROM dbo.[User]
 GROUP BY CAST(JoinedAt AS date)
 ORDER BY [Date]`;

// T4
export const genderDivision = () => `
SELECT Gender.Name AS Gender, COUNT([User].ID) AS UserCount
  FROM dbo.[User]
       INNER JOIN dbo.Gender ON [User].GenderID = Gender.ID
 GROUP BY Gender.Name
 ORDER BY UserCount DESC, Gender.Name`;
