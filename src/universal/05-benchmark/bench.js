// bench.js — calls every endpoint several times and shows the times
//
//   npm run bench                         the API must be running in another window (npm run dev)
//   node bench.js 10                      10 times every address
//   node bench.js 5 http://localhost:4000
//
// "First" is shown separately, because the first time is always slower: connection, query plan,
// cache. The median is the number to write down. Works the same on Windows, macOS and Linux.

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

console.log(`${base}, ${runs} times every address\n`);
console.log(
  "Address".padEnd(34) + "Status".padEnd(10) + "First".padStart(10) +
  "Median".padStart(10) + "Min".padStart(10) + "Max".padStart(10) + "Response".padStart(12)
);

for (const path of endpoints) {
  const times = [];
  const statuses = new Set();
  let bytes = 0;

  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(base + path, { signal: AbortSignal.timeout(120_000) });
      const body = await res.arrayBuffer();      // wait for the whole response, as a browser does
      bytes = body.byteLength;
      statuses.add(res.status);
    } catch (err) {
      statuses.add(err.name === "TimeoutError" ? "timeout" : "error");
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
