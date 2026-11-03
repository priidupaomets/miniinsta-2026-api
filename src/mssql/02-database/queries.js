// KÕIK SQL ELAB SIIN. Täielik tekst koos selgitustega: miniinsta-api-queries.sql
//
// STAATUS: kohahoidjad. Päringud kirjutatakse siia pärast ülevaatust.
// Numbrid (H1, U1 …) on sama failis oleva päringu number.

export const health = "-- KOHAHOIDJA H1: SELECT 1 AS ok, DB_NAME() AS db";

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
