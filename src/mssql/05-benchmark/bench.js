// bench.js — kutsub iga lõpp-punkti mitu korda ja näitab aegu (8. loeng: „Tehke tabel")
//
//   npm run bench                         API peab samal ajal teises aknas käima (npm run dev)
//   node bench.js 10                      10 korda iga aadressi
//   node bench.js 5 http://localhost:4000
//
// „Esimene" on eraldi, sest esimene kord on alati aeglasem: ühendus, päringuplaan, vahemälu.
// Mediaan on see, mida tabelisse kirjutada. Töötab ühtemoodi Windowsis, macOS-is ja Linuxis.

const runs = Number(process.argv[2] || 5);
const base = process.argv[3] || `http://localhost:${process.env.PORT || 3000}`;

const endpoints = [
  "/api/users",
  "/api/users/120",
  "/api/users/cbaccup3b",
  "/api/users/cbaccup3b/posts",
  "/api/frontpage",
  "/api/profile/120",
  "/api/profile/cbaccup3b",
  "/api/posts/72",
  "/api/posts/461/media?after=826",
  "/api/stats",
  "/api/stats/top10/followedusers",
  "/api/stats/registrations",
  "/api/stats/genderdivision"
];

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(0)} ms`);

console.log(`${base}, ${runs} korda iga aadressi\n`);
console.log(
  "Aadress".padEnd(34) + "Olek".padEnd(10) + "Esimene".padStart(10) +
  "Mediaan".padStart(10) + "Min".padStart(10) + "Max".padStart(10) + "Vastus".padStart(12)
);

for (const path of endpoints) {
  const times = [];
  const statuses = new Set();
  let bytes = 0;

  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(base + path, { signal: AbortSignal.timeout(120_000) });
      const body = await res.arrayBuffer();      // ootame kogu vastuse ära, nagu brauser
      bytes = body.byteLength;
      statuses.add(res.status);
    } catch (err) {
      statuses.add(err.name === "TimeoutError" ? "aegus" : "viga");
    }
    times.push(performance.now() - t0);
  }

  const rest = times.length > 1 ? times.slice(1) : times;
  const size = bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  console.log(
    path.padEnd(34) + [...statuses].join(",").padEnd(10) + fmt(times[0]).padStart(10) +
    fmt(median(rest)).padStart(10) + fmt(Math.min(...rest)).padStart(10) +
    fmt(Math.max(...rest)).padStart(10) + size.padStart(12)
  );
}
