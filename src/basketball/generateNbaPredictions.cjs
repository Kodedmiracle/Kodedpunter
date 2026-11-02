// src/basketball/generateNbaPredictions.cjs
const fs = require("fs");

const KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!KEY) {
  console.error("Set HIGHLIGHTLY_API_KEY first");
  process.exit(1);
}

const BASE = "https://nba.highlightly.net";
const HOME_ADV = 3.0;

async function get(path) {
  const res = await fetch(BASE + path, {
    headers: { "x-rapidapi-key": KEY },
  });
  if (!res.ok) throw new Error(path + " → HTTP " + res.status);
  return res.json();
}
function statMap(statistics) {
  const m = {};
  for (const s of statistics || []) {
    m[s.displayName] = s.value;
  }
  return m;
}

function num(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildTeamTable(standingsBody) {
  const byId = new Map();
  const blocks = standingsBody.data || [];
  for (const block of blocks) {
    for (const row of block.data || []) {
      const t = row.team;
      if (!t || t.id == null) continue;
      const s = statMap(row.statistics);
      byId.set(t.id, {
        id: t.id,
        name: t.displayName || t.name,
        abbreviation: t.abbreviation,
        logo: t.logo || null,
        ppg: num(s["Points Per Game"], 112),
        oppPpg: num(s["Opponent Points Per Game"], 112),
        wins: num(s["Wins"], 0),
        losses: num(s["Losses"], 0),
        winPct: num(s["Win Percentage"], 0.5),
      });
    }
  }
  return byId;
}

function homeWinProb(expectedMargin) {
  const p = 1 / (1 + Math.exp(-expectedMargin / 6));
  return Math.round(p * 1000) / 10;
}

function predictGame(match, teams) {
  const home = teams.get(match.homeTeam && match.homeTeam.id);
  const away = teams.get(match.awayTeam && match.awayTeam.id);
  if (!home || !away) return null;

  const expHome = (home.ppg + away.oppPpg) / 2 + HOME_ADV;
  const expAway = (away.ppg + home.oppPpg) / 2;
  const total = expHome + expAway;
  const margin = expHome - expAway;
  const homePct = homeWinProb(margin);
  const awayPct = Math.round((100 - homePct) * 10) / 10;
  const totalLine = Math.round(total * 2) / 2;

  return {
    competition: "NBA",
    matchId: match.id,
    homeTeam: home.name,
    awayTeam: away.name,
    homeCrest: home.logo,
    awayCrest: away.logo,
    kickoff: match.date,
    prediction: {
      expectedPoints: {
        home: Math.round(expHome * 10) / 10,
        away: Math.round(expAway * 10) / 10,
        total: Math.round(total * 10) / 10,
      },
      moneyline: {
        home: {
          probability: homePct,
          confidence: homePct >= 65 ? "HIGH" : homePct >= 55 ? "MEDIUM" : "LOW",
        },
        away: {
          probability: awayPct,
          confidence: awayPct >= 65 ? "HIGH" : awayPct >= 55 ? "MEDIUM" : "LOW",
        },
      },
      totalPoints: {
        line: totalLine,
        over: { probability: 52, confidence: "MEDIUM" },
        under: { probability: 48, confidence: "MEDIUM" },
        projected: Math.round(total * 10) / 10,
      },
    },
  };
}

async function main() {
  console.log("Fetching standings EAST + WEST…");
  const east = await get("/standings?leagueType=NBA&abbreviation=EAST&limit=20");
  const west = await get("/standings?leagueType=NBA&abbreviation=WEST&limit=20");
  const teams = buildTeamTable(east);
  for (const [id, t] of buildTeamTable(west)) teams.set(id, t);
  console.log("Teams loaded:", teams.size);

console.log("Fetching matches for next 8 days…");
  const matches = [];
  const seen = new Set();
  const start = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    const body = await get("/matches?league=NBA&date=" + day + "&limit=30");
    for (const m of body.data || []) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      matches.push(m);
    }
  }
  const scheduled = matches.filter(function (m) {
    const desc = ((m.state && m.state.description) || "").toLowerCase();
    return desc.indexOf("schedule") !== -1;
  });
  console.log("Scheduled games:", scheduled.length);
  const predictions = [];
  for (const m of scheduled) {
    const p = predictGame(m, teams);
    if (p) predictions.push(p);
  }

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/nba-predictions.json",
    JSON.stringify(predictions, null, 2)
  );
  fs.writeFileSync(
    "public/nba-meta.json",
    JSON.stringify(
      { generatedAt: new Date().toISOString(), matchCount: predictions.length },
      null,
      2
    )
  );

  console.log(
    "Saved",
    predictions.length,
    "NBA predictions → public/nba-predictions.json"
  );
  if (predictions[0]) {
    const s = predictions[0];
    console.log(
      "Sample:",
      s.awayTeam,
      "@",
      s.homeTeam,
      "| home",
      s.prediction.moneyline.home.probability + "%",
      "| total \~",
      s.prediction.expectedPoints.total
    );
  }
}

main().catch(function (e) {
  console.error(e.message);
  process.exit(1);
});
