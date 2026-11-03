// src/basketball/fetchNcaa.cjs
// List upcoming NCAAB games from Highlightly.
// Usage: HIGHLIGHTLY_API_KEY=xxx node src/basketball/fetchNcaa.cjs

const KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!KEY) {
  console.error("Set HIGHLIGHTLY_API_KEY first");
  process.exit(1);
}

const BASE = "https://nba.highlightly.net";

async function main() {
  const start = new Date();
  let total = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    const url =
      BASE + "/matches?league=NCAA&date=" + day + "&limit=30";
    const res = await fetch(url, {
      headers: { "x-rapidapi-key": KEY },
    });
    if (!res.ok) {
      console.error(day, "HTTP", res.status);
      continue;
    }
    const body = await res.json();
    const rows = body.data || [];
    console.log("---", day, "games:", rows.length);
    for (const m of rows.slice(0, 6)) {
      const home = (m.homeTeam && (m.homeTeam.displayName || m.homeTeam.name)) || "?";
      const away = (m.awayTeam && (m.awayTeam.displayName || m.awayTeam.name)) || "?";
      const state = (m.state && m.state.description) || "";
      console.log(" ", away, "@", home, "|", state);
    }
    total += rows.length;
  }
  console.log("Total listed:", total);
}

main().catch(function (e) {
  console.error(e.message);
  process.exit(1);
});
