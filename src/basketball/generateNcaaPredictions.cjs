// src/basketball/generateNcaaPredictions.cjs
// Usage: HIGHLIGHTLY_API_KEY=xxx node src/basketball/generateNcaaPredictions.cjs

const fs = require("fs");

const KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!KEY) {
  console.error("Set HIGHLIGHTLY_API_KEY first");
  process.exit(1);
}

const BASE = "https://nba.highlightly.net";
const HOME_ADV = 3.5;
const CONFS = ["ACC", "BIG10", "BIG12", "SEC", "BIGE", "BIG12", "PAC12", "AAC", "ATL10", "WCC"];

async function get(path) {
  const res = await fetch(BASE + path, {
    headers: { "x-rapidapi-key": KEY },
  });
  if (!res.ok) throw new Error(path + " → HTTP " + res.status);
  return res.json();
}

function statMap(statistics) {
  const m = {};
  for (const s of statistics || []) m[s.displayName] = s.value;
  return m;
}

function num(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildTeamTable(body, byId) {
  for (const block of body.data || []) {
    for (const row of block.data || []) {
      const t = row.team;
      if (!t || t.id == null) continue;
      const s = statMap(row.statistics);
      byId.set(t.id, {
        id: t.id,
        name: t.displayName || t.name,
        logo: t.logo || null,
        ppg: num(s["Points Per Game"], 72),
        oppPpg: num(s["Opponent Points Per Game"], 72),
      });
    }
  }
}

function homeWinProb(margin) {
  return Math.round((1 / (1 + Math.exp(-margin / 6))) * 1000) / 10;
}

function predictGame(match, teams) {
  const home = teams.get(match.homeTeam && match.homeTeam.id) || {
    name: (match.homeTeam && (match.homeTeam.displayName || match.homeTeam.name)) || "Home",
    logo: (match.homeTeam && match.homeTeam.logo) || null,
    ppg: 72,
    oppPpg: 72,
  };
  const away = teams.get(match.awayTeam && match.awayTeam.id) || {
    name: (match.awayTeam && (match.awayTeam.displayName || match.awayTeam.name)) || "Away",
    logo: (match.awayTeam && match.awayTeam.logo) || null,
    ppg: 72,
    oppPpg: 72,
  };

  const expHome = (home.ppg + away.oppPpg) / 2 + HOME_ADV;
  const expAway = (away.ppg + home.oppPpg) / 2;
  const total = expHome + expAway;
  const homePct = homeWinProb(expHome - expAway);
  const awayPct = Math.round((100 - homePct) * 10) / 10;
  const totalLine = Math.round(total * 2) / 2;

  return {
    competition: "NCAAB",
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
        projected: Math.round(total * 10) / 10,
      },
    },
  };
}

async function main() {
  const teams = new Map();
  console.log("Loading a few NCAA conference standings…");
  for (const ab of CONFS) {
    try {
      const body = await get(
        "/standings?leagueType=NCAA&abbreviation=" + ab + "&limit=30"
      );
      buildTeamTable(body, teams);
    } catch (e) {
      console.log("skip", ab, e.message);
    }
  }
  console.log("Teams with stats:", teams.size);

  console.log("Fetching NCAA matches (5 days)…");
  const matches = [];
  const seen = new Set();
  const start = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    const body = await get("/matches?league=NCAA&date=" + day + "&limit=40");
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

  const predictions = [];
  for (const m of scheduled) {
    predictions.push(predictGame(m, teams));
  }

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/ncaa-predictions.json",
    JSON.stringify(predictions, null, 2)
  );
  fs.writeFileSync(
    "public/ncaa-meta.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        matchCount: predictions.length,
        teamsWithStats: teams.size,
      },
      null,
      2
    )
  );

  console.log("Saved", predictions.length, "NCAAB → public/ncaa-predictions.json");
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
