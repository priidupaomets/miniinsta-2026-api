// KÕIK SQL ELAB SIIN. Täielik tekst koos selgitustega: miniinsta-api-queries.sql
// Numbrid (H1, U1 …) on sama failis oleva päringu number.

export const isId = (text) => /^\d+$/.test(text);

// Kas tingimus on ID või kasutajanime järgi (profiil ja kasutaja postitused)
const userCondition = (idOrUsername) =>
  isId(idOrUsername) ? `U.ID = ${idOrUsername}` : `U.Username = '${idOrUsername}'`;

// NB! Väärtused pannakse SQL-teksti sisse liitmisega. See on lihtne, aga mitte turvaline:
// selle juurde tuleme tagasi 12. loengus.

// H1
export const health = "SELECT 1 AS ok, DB_NAME() AS db";

// --- Kasutajad
// U1 (SELECT * on tahtlik: 12. loengu teema)
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

// U5: ID või kasutajanime järgi
export const userPosts = (idOrUsername) => `
SELECT Post.ID, Post.Caption, Post.CreatedAt
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U ON Post.UserID = U.ID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC`;

// --- Esileht
// F1: jälgitavate postitused, laikide arv, piltide arv ja esimene pilt (MediaID on noole jaoks)
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

// --- Profiil: KAKS päringut ühes pöördumises (P1 ja P2), tulemuseks kaks andmehulka
export const profile = (idOrUsername) => `
SELECT U.ID, U.Username, U.FullName, U.ProfilePictureUrl, U.Website, U.Bio,
       (SELECT COUNT(*) FROM dbo.Post      WHERE Post.UserID = U.ID)             AS PostCount,
       (SELECT COUNT(*) FROM dbo.Following WHERE Following.FollowedUserID = U.ID) AS FollowerCount,
       (SELECT COUNT(*) FROM dbo.Following WHERE Following.FollowerUserID = U.ID) AS FollowingCount
  FROM dbo.[User] AS U
 WHERE ${userCondition(idOrUsername)};

SELECT Post.ID, Post.Caption, Post.CreatedAt,
       PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U         ON Post.UserID = U.ID
       LEFT OUTER JOIN dbo.PostMedia      ON Post.ID = PostMedia.PostID
 WHERE ${userCondition(idOrUsername)}
 ORDER BY Post.CreatedAt DESC, Post.ID DESC, PostMedia.ID`;

// --- Postitus: KOLM päringut ühes pöördumises (S1, S2, S3), kolm andmehulka
export const post = (postId) => `
SELECT Post.ID, [User].Username, [User].ProfilePictureUrl, Post.Caption, Post.CreatedAt,
       (SELECT COUNT(*) FROM dbo.Liking WHERE Liking.PostID = Post.ID) AS Likes
  FROM dbo.Post
       INNER JOIN dbo.[User] ON Post.UserID = [User].ID
 WHERE Post.ID = ${postId};

SELECT PostMedia.ID, PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM dbo.PostMedia
 WHERE PostMedia.PostID = ${postId}
 ORDER BY PostMedia.ID;

SELECT Comment.ID AS CommentID, [User].Username, Comment.Content, Comment.CreatedAt
  FROM dbo.Comment
       INNER JOIN dbo.[User] ON Comment.UserID = [User].ID
 WHERE Comment.PostID = ${postId}
 ORDER BY Comment.CreatedAt, Comment.ID`;

// M1: järgmine (after) või eelmine (before) pilt sama postituse juures
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

// --- Statistika
// T1: üldarvud ühe reana
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

// T2: 10 enim jälgitud, koos viikidega (ORDER BY-s ainult FollowerCount, muidu viike ei ole)
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
