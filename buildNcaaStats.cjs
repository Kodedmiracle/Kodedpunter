const fs = require("fs");
const raw = JSON.parse(fs.readFileSync("ncaaStandingsRaw.json", "utf8"));
const stat = (t, n) => parseFloat((t.statistics.find((x) => x.displayName === n) || {}).value);
const rank = (c) => (/post/i.test(c.seasonType) ? 2 : 1);
const best = {}; // `${id}|${year}` -> {games,..., rank}
for (const c of raw) {
  for (const t of c.data || []) {
    const w = stat(t, "Wins"), l = stat(t, "Losses");
    const games = (w || 0) + (l || 0);
    const ppg = stat(t, "Points Per Game"), oppg = stat(t, "Opponent Points Per Game");
    if (!games || !ppg || !oppg) continue;
    const k = t.team.id + "|" + c.year;
    const cur = best[k];
    if (!cur || games > cur.games || (games === cur.games && rank(c) > cur.rank))
      best[k] = { id: t.team.id, name: t.team.displayName, year: c.year, games, ppg, oppg, rank: rank(c) };
  }
}
const out = {};
for (const e of Object.values(best)) {
  const cur = out[e.id];
  const usable = e.year === 2027 ? e.games >= 5 : e.year === 2026;
  if (!usable) continue;
  if (!cur || e.year > cur.year) out[e.id] = { name: e.name, year: e.year, games: e.games, ppg: e.ppg, oppg: e.oppg };
}
fs.writeFileSync("public/ncaa-team-stats.json", JSON.stringify(out));
const v = Object.values(out);
console.log("teams with stats:", v.length, "| from 2027:", v.filter((x) => x.year === 2027).length, "| from 2026:", v.filter((x) => x.year === 2026).length);
for (const id of ["11247", "11263", "11215"]) console.log(id, JSON.stringify(out[id]));
