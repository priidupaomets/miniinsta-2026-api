# MiniInsta API — samm-sammult versioonid

Üks kaust = üks loengusamm. Iga versioon on eelmise täiendus ja töötab eraldi.
Uuendatud Express 5, ESM (`import`), `async/await`, `node --env-file` ja `node --watch`.

| Kaust | Loeng, osa | Mis on uut |
|---|---|---|
| `01-express` | 7. loeng, 2. osa | Express, `/api/users` ja `/api/users/:id` kohahoidja-tekstiga, `PORT` keskkonnamuutujast, `.env` |
| `02-database` | 7. loeng, 5.–6. osa | SQL Serveri ühendus (`mssql`, `db.js`), `/api/health`, kasutajad andmebaasist, kohahoidjad kõigile teistele lõpp-punktidele, Handlebarsi leht `/api` |
| `03-endpoints` | 7. loeng, 7. osa | Esileht, profiil, postitus ja neli statistikat: marsruudid valmis, SQL kohahoidjatena |
| `04-queries` | 8. loeng, 1. osa | Kõik päringud `queries.js`-is. Lisaks: esileht tagastab `MediaID`, uus `/api/posts/:id/media?after=…` / `?before=…` (järgmine / eelmine pilt), `/api/users/:id/posts` ka kasutajanimega, TOP 10 koos viikidega |
| `05-benchmark` | 8. loeng, 2. ja 5. osa | Mõõtmine: logirida iga päringu kohta (kogu aeg, andmebaasi aeg, pöördumiste arv, vastuse suurus), `STATS_IO=1` lisab loetud lehekülgede arvu, `npm run bench` kutsub kõiki aadresse mitu korda |

Hilisemad versioonid (06 lehitsemine, 07 parameetrid, 08 protseduurid, 09 vahemälu) tulevad
vastavate loengute juurde; neid ei ole veel kirjutatud.

## Käivitamine

```
cd 01-express
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run dev                   # või: node --env-file=.env server.js
```

`PORT` võib tulla ka mujalt, ilma `.env`-ita:

| Kest | Käsk |
|---|---|
| macOS / Linux | `PORT=4000 node server.js` |
| PowerShell | `$env:PORT = 4000; node server.js` |
| Command Prompt | `set PORT=4000 && node server.js` |

Versioonidest 02 alates on vaja ka töötavat SQL Serverit, andmebaasi `MiniInsta2026`
(skriptid: `MiniInsta2026-scripts.zip`) ja `appuser`-i õigusi; parool pannakse `.env`-i.

## SQL-i staatus

Versioonides 02–03 on SQL-päringud **kohahoidjad** (`queries.js`, tekst `-- KOHAHOIDJA U1 …`):
need kirjutatakse 8. loengus koos. Versioonist **04** alates on kõik päringud koodis. Päringute
tekst koos selgitustega on failis `miniinsta-api-queries.sql` (numbrid U1, F1, M1 … on samad
mis `queries.js`-is).

`in-lecture/miniinsta` on loengus kirjutatud versioon ainult võrdluseks, mitte alusena.

## Mõõtmine (05)

```
npm run dev                   # 1. aken: API
npm run bench                 # 2. aken: iga aadress 5 korda; node bench.js 10 = 10 korda
```

Logi API aknas:

```
GET /api/frontpage 200 7.9 ms | andmebaas 7.0 ms, 1 pöördumine, 636 lk | 4.6 KB
```

Suure andmebaasiga: `.env`-is `DB_NAME=MiniInsta2026Big` ja API uuesti käivitada.

## Õpetajale

* Veateate tagastamine kliendile ja päringute liitmine on versioonides 02–03 **tahtlikult** nii
  (nagu 2025); koodis on märge „tuleme tagasi 12. loengus".
* Logi on versioonis 05 isekirjutatud (`morgan`-it ei kasutata), et oleks näha, mida see teeb.
  Andmebaasi aeg kogutakse `AsyncLocalStorage`-ga, nii et marsruute ei pea muutma.
* 05 ei muuda päringu aegumist (vaikimisi 15 s): suure andmebaasi peal annab `/api/stats` vea
  15 s pärast, ja see on 8. loengu küsimus. Ärge seda „parandage" enne seda.
* Kontrollitud väikese ja suure andmebaasiga (10/2026): 04 kõik aadressid; 05 `bench.js` ja logi.
