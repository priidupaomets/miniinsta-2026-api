// KÕIK SQL ELAB SIIN. Täielik tekst koos selgitustega: miniinsta-api-queries.sql
//
// STAATUS: kohahoidjad. Päringud kirjutatakse siia pärast ülevaatust.
// Numbrid (H1, U1 …) on sama failis oleva päringu number.

export const isId = (text) => /^\d+$/.test(text);

export const health = "-- KOHAHOIDJA H1: SELECT 1 AS ok, DB_NAME() AS db";

// --- Kasutajad
export const usersAll = () =>
  "-- KOHAHOIDJA U1: kõik kasutajad";

// NB! Väärtus pannakse SQL-teksti sisse liitmisega. See on lihtne, aga mitte turvaline:
// selle juurde tuleme tagasi 12. loengus.
export const userById = (id) =>
  `-- KOHAHOIDJA U2: kasutaja ID järgi (ID = ${id})`;

export const userByUsername = (username) =>
  `-- KOHAHOIDJA U3: kasutaja kasutajanime järgi (Username = '${username}')`;

export const userPosts = (id) =>
  `-- KOHAHOIDJA U5: kasutaja postitused (UserID = ${id})`;

// --- Esileht
export const frontpage = (userId) =>
  `-- KOHAHOIDJA F1: esileht (@UserID = ${userId})`;

// --- Profiil: KAKS päringut ühes pöördumises (P1 ja P2), tulemuseks kaks andmehulka.
// Tingimus on kas `U.ID = …` või `U.Username = '…'`.
export const profile = (idOrUsername) => {
  const condition = isId(idOrUsername)
    ? `U.ID = ${idOrUsername}`
    : `U.Username = '${idOrUsername}'`;

  return `-- KOHAHOIDJA P1 + P2: profiil ja postitused (WHERE ${condition})`;
};

// --- Postitus: KOLM päringut ühes pöördumises (S1, S2, S3), kolm andmehulka
export const post = (postId) =>
  `-- KOHAHOIDJA S1 + S2 + S3: postitus, meedia, kommentaarid (PostID = ${postId})`;

// --- Statistika
export const stats = () =>
  "-- KOHAHOIDJA T1: üldarvud";

export const top10FollowedUsers = () =>
  "-- KOHAHOIDJA T2: 10 enim jälgitud kasutajat";

export const registrations = () =>
  "-- KOHAHOIDJA T3: liitumised päevade kaupa";

export const genderDivision = () =>
  "-- KOHAHOIDJA T4: kasutajad soo järgi";
