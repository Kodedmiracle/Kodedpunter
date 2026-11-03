const fs = require("fs");
const key = process.env.HIGHLIGHTLY_API_KEY;
const get = async (off) => {
  const r = await fetch("https://nba.highlightly.net/standings?leagueType=NCAA&limit=100&offset=" + off, { headers: { "x-rapidapi-key": key }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error("status " + r.status);
  return (await r.json()).data || [];
};
(async () => {
  let all = [];
  for (const off of [0, 100, 200, 300]) {
    all = all.concat(await get(off));
    console.log("got offset", off, "total rows", all.length);
    await new Promise((r) => setTimeout(r, 13000));
  }
  fs.writeFileSync("ncaaStandingsRaw.json", JSON.stringify(all));
  const rec = (row, name) => {
    const t = (row.data || []).find((x) => x.team.displayName.includes(name));
    if (!t) return "-";
    const s = (n) => (t.statistics.find((x) => x.displayName === n) || {}).value;
    return s("Team Season Record") + " ppg " + s("Points Per Game");
  };
  const sec = all.filter((c) => c.abbreviation === "SEC");
  console.log("SEC rows:", sec.length);
  console.log("SEC first row Missouri:", rec(sec[0], "Missouri"));
  console.log("SEC last row Missouri:", rec(sec[sec.length - 1], "Missouri"));
  const wof = all.filter((c) => (c.data || []).some((x) => x.team.displayName.includes("Wofford")));
  console.log("Wofford rows:", wof.length, wof.map((c) => c.abbreviation).slice(0, 3));
  console.log("distinct conferences:", new Set(all.map((c) => c.abbreviation)).size);
})().catch((e) => console.log("failed:", e.message));
