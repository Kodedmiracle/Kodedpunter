// src/basketball/fetchNba.cjs
// Local test: list upcoming NBA games from Highlightly.
// Usage: HIGHLIGHTLY_API_KEY=xxx node src/basketball/fetchNba.cjs

const KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!KEY) {
  console.error("Set HIGHLIGHTLY_API_KEY first");
  process.exit(1);
}

const BASE = "https://nba.highlightly.net";

async function main() {
  const url = `${BASE}/matches?league=NBA&limit=15`;
  const res = await fetch(url, {
    headers: { "x-rapidapi-key": KEY },
  });
  if (!res.ok) {
    console.error("HTTP", res.status, await res.text());
    process.exit(1);
  }
  const body = await res.json();
  const rows = body.data || body || [];
  console.log("Games:", rows.length);
  for (const m of rows) {
    const home = m.homeTeam?.displayName || m.homeTeam?.name || "?";
    const away = m.awayTeam?.displayName || m.awayTeam?.name || "?";
    const when = m.date || "";
    const state = m.state?.description || "";
    console.log(`${when} | ${away} @ ${home} | ${state}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
