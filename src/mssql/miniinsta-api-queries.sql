/*
=====================================================================================
 MiniInsta API — kõik päringud ühes failis (ÜLEVAATUSEKS)
 Andmebaas: MiniInsta2026 (MS SQL) — tabelite ja veergude nimed täpselt skeemi järgi
 Kasutus:   Node.js API versioonid 02 … 09 (kaust miniinsta-api/)

 STAATUS: kavand. API koodis on SQL-i asemel praegu kohahoidjad (TODO päring X).
          Kui see fail on üle vaadatud, kopeeritakse päringud koodi (fail queries.js).
=====================================================================================

 KUIDAS SEDA FAILI LUGEDA
 - Iga päring on lahus (GO-ga) ja ees on DECLARE rida näidisväärtusega, nii et
   saab kogu faili SSMS-is jooksutada ja tulemust vaadata.
 - API-s sisestatakse samad väärtused kahel viisil:
     versioonid 02–06   sõne liitmisega   `... WHERE ID = ${id}`      (nagu 2025)
     versioonid 07–09   parameetritega    `... WHERE ID = @ID`  + .input("ID", sql.Int, id)
   Päringu tekst jääb sama, ainult DECLARE asemel tuleb väärtus API-st.
 - Näidisväärtused (kontrollitud kanoonilistel andmetel):
     @UserID   = 152            esilehe kasutaja (jälgib 6 kasutajat, nende 20 postitust)
     @ID       = 120            profiil 'cbaccup3b' (6 postitust, 5 jälgijat) — sama nimi, mis 2025. aastal
     @PostID   = 72             1 pilt, 5 kommentaari, 3 meeldimist
     @Username = N'cbaccup3b'

 VERSIOONIDE KAART
   02  H1, U1–U3                        ühendus ja kasutajad                    (7. loeng)
   03  F1, P1–P2, S1–S3, T1–T4          kõik lõpp-punktid, SQL kohahoidjatena   (7. loeng)
   04  U5, F1, P1–P2, S1–S3, M1, T1–T4  kõik päringud koodis                    (8. loeng)
   05  — (päringud samad)               mõõtmine: logi, andmebaasi aeg, bench.js (8.–9. loeng)
   06  U4, F2   (F3 ainult loengus)      lehitsemine                             (11. loeng)
   07  U1b–U3b ja kõik eelmised @param  parameetrid, SELECT * kaob              (12. loeng)
   08  protseduurid GetUsers jt         protseduur API taga + õigused          (12.–14. loeng)
   09  — (päringud samad)               vahemälu                                (13. loeng)

 OTSUSED, MIDA SIN TEHA TAHAN  (R = review)
 R1  U1–U3 on tahtlikult `SELECT *`  → vastuses on ka Password, Email ja Phone.
     Nii oli 2025 ja see on 12. loengu probleem („mis API tagastab, mida ta ei peaks"),
     seepärast ei paranda me seda enne seda loengut. Parandus on U1b–U3b (versioon 07).
     Kui soovid selle kohe sulgeda, kasuta U1b–U3b juba versioonis 02.
 R2  F1 kasutab OUTER APPLY, mitte CROSS APPLY nagu 2025.
     Andmetes on 90 postitust 500-st ilma pildita (kasutaja 152 esilehel 4 20-st); CROSS APPLY jätaks need esilehelt
     vaikselt välja. Lisatud on ka ORDER BY PostMedia.ID, et „esimene pilt" oleks
     kindel (2025. aastal ilma ORDER BY-ta: juhuslik).
 R3  F1 jälgib ainult teisi, mitte iseennast (nagu 2025). Instagramis on oma postitused
     ka voos; selle arutelu on 7. loengu märkmetes.
 R4  T1 ümardab keskmised kahe komakohani (`1.0 * ...`). 2025 oli AVG täisarvul, mis
     lõikab komakohad maha (nt 2.5 → 2) — vaikne viga, kuid ka hea õppeabi, kui tahad.
 R5  Põhjendamatud asjad 2025. aastast on välja jäetud: `IsNull(Count(..), 0)` (COUNT ei
     ole kunagi NULL), `genderDivision` kasutamata `where`-haru, ORDER BY Post.CreationTime
     meediapäringus, mis ei vajanud Post tabelit.
 R6  Lisatud uued väljad: Caption (esileht, profiil, postitus) ja kommenteerija
     Username (kommentaarid). PostTag-i API-s ei ole (vajadusel eraldi päring).
 R7  Nimed uuest skeemist: FullName, ProfilePictureUrl, Bio, JoinedAt, CreatedAt,
     Content, FollowerUserID, FollowedUserID. Vanu (Description, ImageUrl,
     CreationTime, LocationName, FolloweeID) ei ole.
 R8  Lehitsemine (D) kasutab alati järjestust (CreatedAt, ID) — ilma ühese järjestuseta
     tekivad lehtede vahel kordused (7. ja 11. loengu hoiatus).
 R9  P2 tagastab ühe rea meedia kohta (kasutaja 120: 6 postitust → 17 rida), nagu 2025.
     Sobib hästi õppeks („miks on ridu rohkem kui postitusi?"); koodis neid ei grupeerita.
 R10 Võtmelehitsemine (F3) on SQL-ina olemas, kuid API-sse ei lähe: CreatedAt on
     datetime2(7), Node'i Date aga ainult millisekundi täpsusega — kursor tuleks anda
     tekstina (`CONVERT(varchar(27), CreatedAt, 126)`), muidu võivad read korduda
     või puududa. Kontrollitud: F3 annab sama lehekülje mis F2 (PostgreSQL-i vastega).
 R11 8. loengu lisad (versioon 04): F1 tagastab ka MediaID (esimese pildi ID); uus M1 („järgmine
     pilt" noolega, võtmega ID > @MediaID); T2 ilma Username-ita ORDER BY-s, et WITH TIES töötaks
     (16 rida, enne alati 10); U5 töötab ka kasutajanimega (/api/users/sguys4/posts, nagu loengus).
*/

USE [MiniInsta2026];
GO

/* =====================================================================================
   A · ÜHENDUSE KONTROLL                                                 (versioon 02)
   ===================================================================================== */

-- H1 · GET /api/health  — kogu ahel brauser → Node → ajur → andmebaas
SELECT 1 AS ok, DB_NAME() AS db;
GO
-- Vastus JSON-ina: {"ok":1,"db":"MiniInsta2026"}


/* =====================================================================================
   B · KASUTAJAD                                                         (versioon 02)
   ===================================================================================== */

-- U1 · GET /api/users            — kõik kasutajad                     (R1: SELECT *)
SELECT *
  FROM dbo.[User]
 ORDER BY ID;
GO

-- U2 · GET /api/users/120        — kasutaja ID järgi
DECLARE @ID int = 120;
SELECT *
  FROM dbo.[User]
 WHERE ID = @ID;
GO

-- U3 · GET /api/users/cbaccup3b  — kasutaja kasutajanime järgi
DECLARE @Username nvarchar(50) = N'cbaccup3b';
SELECT *
  FROM dbo.[User]
 WHERE Username = @Username;
GO

-- U5 · GET /api/users/120/posts  (või /api/users/cbaccup3b/posts)  — ühe kasutaja postitused
--      (versioonides 02–03 kohahoidja). Kasutajanime korral on tingimus `U.Username = @Username`,
--      seepärast liitub User ka siin (sama mõte, mis P2-s).
DECLARE @ID int = 120;
SELECT Post.ID, Post.Caption, Post.CreatedAt
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U ON Post.UserID = U.ID
 WHERE U.ID = @ID
 ORDER BY Post.CreatedAt DESC, Post.ID DESC;
GO


/* =====================================================================================
   C · KÕIK ÜLEJÄÄNUD LÕPP-PUNKTID                    (versioon 03 kohahoidjad, 04 päringud)
   ===================================================================================== */

-- F1 · GET /api/frontpage   — esileht (kasutaja on koodis kõvasti 152): jälgitavate postitused, uuemad enne  (R2, R3)
DECLARE @UserID int = 152;
SELECT Post.ID            AS PostID,
       U.ID               AS UserID,
       U.Username,
       Post.Caption,
       Post.CreatedAt,
       COUNT(Liking.UserID) AS LikeCount,
       (SELECT COUNT(*) FROM dbo.PostMedia WHERE PostMedia.PostID = Post.ID) AS MediaCount,
       PM.ID              AS MediaID,          -- noole jaoks: järgmine pilt on M1-ga „pärast seda"
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
 WHERE Following.FollowerUserID = @UserID
 GROUP BY Post.ID, U.ID, U.Username, Post.Caption, Post.CreatedAt,
          PM.ID, PM.MediaTypeID, PM.MediaFileUrl
 ORDER BY Post.CreatedAt DESC, Post.ID DESC;
GO

-- P1 · GET /api/profile/120 (või /api/profile/cbaccup3b)  — profiil, 1. andmehulk
--      Kasutajanime korral on tingimus `U.Username = @Username` (API valib tingimuse).
DECLARE @ID int = 120;
SELECT U.ID, U.Username, U.FullName, U.ProfilePictureUrl, U.Website, U.Bio,
       (SELECT COUNT(*) FROM dbo.Post      WHERE Post.UserID = U.ID)             AS PostCount,
       (SELECT COUNT(*) FROM dbo.Following WHERE Following.FollowedUserID = U.ID) AS FollowerCount,
       (SELECT COUNT(*) FROM dbo.Following WHERE Following.FollowerUserID = U.ID) AS FollowingCount
  FROM dbo.[User] AS U
 WHERE U.ID = @ID;
GO

-- P2 · sama lõpp-punkt, 2. andmehulk — profiili postitused koos meediaga (üks rida meedia kohta)
--      Tingimus on sama mis P1-s (`U.ID = @ID` või `U.Username = @Username`), seepärast liitub User ka siin.
DECLARE @ID int = 120;
SELECT Post.ID, Post.Caption, Post.CreatedAt,
       PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U         ON Post.UserID = U.ID
       LEFT OUTER JOIN dbo.PostMedia      ON Post.ID = PostMedia.PostID
 WHERE U.ID = @ID
 ORDER BY Post.CreatedAt DESC, Post.ID DESC, PostMedia.ID;
GO
-- NB! Tulemuses on 17 rida 6 postituse kohta: üks rida iga pildi/video kohta (liitumise
--     „paljunemine"). 2025. aastal oli sama; API tagastab read nii, nagu nad on. (R9)

-- S1 · GET /api/posts/72  — postitus, 1. andmehulk
DECLARE @PostID int = 72;
SELECT Post.ID, [User].Username, [User].ProfilePictureUrl, Post.Caption, Post.CreatedAt,
       (SELECT COUNT(*) FROM dbo.Liking WHERE Liking.PostID = Post.ID) AS Likes
  FROM dbo.Post
       INNER JOIN dbo.[User] ON Post.UserID = [User].ID
 WHERE Post.ID = @PostID;
GO

-- S2 · sama lõpp-punkt, 2. andmehulk — postituse pildid/videod
DECLARE @PostID int = 72;
SELECT PostMedia.ID, PostMedia.MediaTypeID, PostMedia.MediaFileUrl
  FROM dbo.PostMedia
 WHERE PostMedia.PostID = @PostID
 ORDER BY PostMedia.ID;
GO

-- S3 · sama lõpp-punkt, 3. andmehulk — kommentaarid vanemast uuemani
DECLARE @PostID int = 72;
SELECT Comment.ID AS CommentID, [User].Username, Comment.Content, Comment.CreatedAt
  FROM dbo.Comment
       INNER JOIN dbo.[User] ON Comment.UserID = [User].ID
 WHERE Comment.PostID = @PostID
 ORDER BY Comment.CreatedAt, Comment.ID;
GO

-- M1 · GET /api/posts/461/media?after=826  — järgmine pilt (esilehe nool →), 8. loeng
--      Esileht tagastab ainult esimese pildi ja MediaCount-i; ülejäänud tulevad ühekaupa siis,
--      kui keegi neid vaatab. Eelmine pilt: ?before=826 → `ID < @MediaID ... ORDER BY ID DESC`.
DECLARE @PostID int = 461, @MediaID int = 826;
SELECT TOP 1 ID AS MediaID, MediaTypeID, MediaFileUrl
  FROM dbo.PostMedia
 WHERE PostID = @PostID
   AND ID > @MediaID
 ORDER BY ID;
GO
-- Vastus: 827, video. Kui järgmist ei ole, on tulemus tühi (API: 404).

-- T1 · GET /api/stats  — üldarvud ühe reana                                   (R4)
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
         AS MaxLikesPerPost;
GO

-- T2 · GET /api/stats/top10/followedusers  — 10 enim jälgitud kasutajat, koos viikidega
--      WITH TIES võrdleb KÕIKI ORDER BY veerge. Kui seal oleks ka `, [User].Username`, ei oleks
--      kunagi viiki ja tuleks alati täpselt 10 rida (nii oli see kuni 8. loenguni). Nüüd: 16 rida.
SELECT TOP 10 WITH TIES
       [User].ID, [User].Username, COUNT(Following.FollowedUserID) AS FollowerCount
  FROM dbo.[User]
       LEFT OUTER JOIN dbo.Following ON [User].ID = Following.FollowedUserID
 GROUP BY [User].ID, [User].Username
 ORDER BY FollowerCount DESC;
GO

-- T3 · GET /api/stats/registrations  — liitumised päevade kaupa
SELECT CAST(JoinedAt AS date) AS [Date], COUNT(ID) AS UserCount
  FROM dbo.[User]
 GROUP BY CAST(JoinedAt AS date)
 ORDER BY [Date];
GO

-- T4 · GET /api/stats/genderdivision  — kasutajad soo järgi                    (R5)
SELECT Gender.Name AS Gender, COUNT([User].ID) AS UserCount
  FROM dbo.[User]
       INNER JOIN dbo.Gender ON [User].GenderID = Gender.ID
 GROUP BY Gender.Name
 ORDER BY UserCount DESC, Gender.Name;
GO


/* =====================================================================================
   D · LEHITSEMINE                                                       (versioon 06)
   ===================================================================================== */

-- U4 · GET /api/users?page=3&pageSize=20  — OFFSET-lehitsemine (R8)
DECLARE @Skip int = 40, @Take int = 20;           -- API arvutab: skip = (page - 1) * pageSize
SELECT *
  FROM dbo.[User]
 ORDER BY ID
OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
GO

-- F2 · GET /api/frontpage?page=2&pageSize=5  — esileht OFFSET-iga
DECLARE @UserID int = 152, @Skip int = 5, @Take int = 5;
SELECT Post.ID AS PostID, U.ID AS UserID, U.Username, Post.Caption, Post.CreatedAt,
       COUNT(Liking.UserID) AS LikeCount,
       (SELECT COUNT(*) FROM dbo.PostMedia WHERE PostMedia.PostID = Post.ID) AS MediaCount,
       PM.ID AS MediaID, PM.MediaTypeID, PM.MediaFileUrl
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U      ON Post.UserID = U.ID
       INNER JOIN dbo.Following        ON Post.UserID = Following.FollowedUserID
       LEFT OUTER JOIN dbo.Liking      ON Post.ID = Liking.PostID
       OUTER APPLY (SELECT TOP 1 ID, MediaTypeID, MediaFileUrl
                      FROM dbo.PostMedia WHERE PostMedia.PostID = Post.ID
                     ORDER BY PostMedia.ID) AS PM
 WHERE Following.FollowerUserID = @UserID
 GROUP BY Post.ID, U.ID, U.Username, Post.Caption, Post.CreatedAt, PM.ID, PM.MediaTypeID, PM.MediaFileUrl
 ORDER BY Post.CreatedAt DESC, Post.ID DESC
OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
GO

-- F3 · võtmelehitsemine — AINULT LOENGU JAOKS (11. loeng), API versioonis 06 seda ei ole.  (R10)
--      @Before ja @BeforeID on eelmise lehekülje viimase rea CreatedAt ja PostID.
DECLARE @UserID int = 152, @Take int = 5, @Before datetime2(7), @BeforeID int;
-- Näidis: võta „eelmise lehekülje" (5 uusimat) viimane rida. API-s tulevad need kliendilt.
SELECT TOP 1 @Before = x.CreatedAt, @BeforeID = x.ID
  FROM (SELECT TOP 5 Post.ID, Post.CreatedAt
          FROM dbo.Post INNER JOIN dbo.Following ON Post.UserID = Following.FollowedUserID
         WHERE Following.FollowerUserID = @UserID
         ORDER BY Post.CreatedAt DESC, Post.ID DESC) AS x
 ORDER BY x.CreatedAt, x.ID;
SELECT TOP (@Take)
       Post.ID AS PostID, U.ID AS UserID, U.Username, Post.Caption, Post.CreatedAt,
       COUNT(Liking.UserID) AS LikeCount,
       (SELECT COUNT(*) FROM dbo.PostMedia WHERE PostMedia.PostID = Post.ID) AS MediaCount,
       PM.ID AS MediaID, PM.MediaTypeID, PM.MediaFileUrl
  FROM dbo.Post
       INNER JOIN dbo.[User] AS U      ON Post.UserID = U.ID
       INNER JOIN dbo.Following        ON Post.UserID = Following.FollowedUserID
       LEFT OUTER JOIN dbo.Liking      ON Post.ID = Liking.PostID
       OUTER APPLY (SELECT TOP 1 ID, MediaTypeID, MediaFileUrl
                      FROM dbo.PostMedia WHERE PostMedia.PostID = Post.ID
                     ORDER BY PostMedia.ID) AS PM
 WHERE Following.FollowerUserID = @UserID
   AND (Post.CreatedAt < @Before OR (Post.CreatedAt = @Before AND Post.ID < @BeforeID))
 GROUP BY Post.ID, U.ID, U.Username, Post.Caption, Post.CreatedAt, PM.ID, PM.MediaTypeID, PM.MediaFileUrl
 ORDER BY Post.CreatedAt DESC, Post.ID DESC;
GO


/* =====================================================================================
   E · PÄRAST 12. LOENGUT: ÕIGED VEERUD                                  (versioon 07)
   Sama päring, aga ilma `SELECT *`-ita: Password, Email ja Phone ei lahku andmebaasist.
   (U4 saab sama muudatuse.)
   ===================================================================================== */

-- U1b · GET /api/users
SELECT ID, Username, FullName, ProfilePictureUrl, Website, Bio, GenderID, JoinedAt
  FROM dbo.[User]
 ORDER BY ID;
GO

-- U2b · GET /api/users/120
DECLARE @ID int = 120;
SELECT ID, Username, FullName, ProfilePictureUrl, Website, Bio, GenderID, JoinedAt
  FROM dbo.[User]
 WHERE ID = @ID;
GO

-- U3b · GET /api/users/cbaccup3b
DECLARE @Username nvarchar(50) = N'cbaccup3b';
SELECT ID, Username, FullName, ProfilePictureUrl, Website, Bio, GenderID, JoinedAt
  FROM dbo.[User]
 WHERE Username = @Username;
GO


/* =====================================================================================
   F · PROTSEDUURID                                                      (versioon 08)
   Sama tulemus nagu U1b–U3b, aga SQL elab andmebaasis; API kutsub ainult nime.
   ===================================================================================== */

CREATE OR ALTER PROCEDURE dbo.GetUsers
    @Page     int = 1,
    @PageSize int = 10
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ID, Username, FullName, ProfilePictureUrl, Website, Bio, GenderID, JoinedAt
      FROM dbo.[User]
     ORDER BY ID
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.GetUserByID
    @ID int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ID, Username, FullName, ProfilePictureUrl, Website, Bio, GenderID, JoinedAt
      FROM dbo.[User]
     WHERE ID = @ID;
END;
GO

CREATE OR ALTER PROCEDURE dbo.GetUserByUsername
    @Username nvarchar(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ID, Username, FullName, ProfilePictureUrl, Website, Bio, GenderID, JoinedAt
      FROM dbo.[User]
     WHERE Username = @Username;
END;
GO

-- Õigus nimeliselt, mitte kogu skeemile (2025. aastal: GRANT EXECUTE … WITH GRANT OPTION)
-- Eeldus: `appuser` kasutaja on selles andmebaasis loodud (4. osa slaidid).
GRANT EXECUTE ON OBJECT::dbo.GetUsers          TO appuser;
GRANT EXECUTE ON OBJECT::dbo.GetUserByID       TO appuser;
GRANT EXECUTE ON OBJECT::dbo.GetUserByUsername TO appuser;
GO

-- Kontroll
EXEC dbo.GetUsers @Page = 3, @PageSize = 20;
EXEC dbo.GetUserByID @ID = 120;
EXEC dbo.GetUserByUsername @Username = N'cbaccup3b';
GO
