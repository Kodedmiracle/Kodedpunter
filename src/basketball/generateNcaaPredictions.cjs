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
const SHRINK_GAMES = 12;
const MIN_GAMES_HIGH = 5;
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
        games: num(s["Wins"], 0) + num(s["Losses"], 0),
      });
    }
  }
}

function leagueAvgPpg(teams) {
  let sum = 0;
  let n = 0;
  for (const t of teams.values()) {
    if ((t.games || 0) > 0) {
      sum += t.ppg;
      n++;
    }
  }
  return n ? sum / n : 72;
}

function homeWinProb(margin) {
  const p = 1 / (1 + Math.exp(-margin / 7));
  const capped = Math.min(0.85, Math.max(0.15, p));
  return Math.round(capped * 1000) / 10;
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

  const lg = leagueAvgPpg(teams);
  const sh = (t, v) => {
    const g = t.games || 0;
    const w = g / (g + SHRINK_GAMES);
    return w * v + (1 - w) * lg;
  };
  const thin = home.prior || away.prior || (home.games || 0) < MIN_GAMES_HIGH || (away.games || 0) < MIN_GAMES_HIGH;
  const missing = !((home.games || 0) > 0 && (away.games || 0) > 0);
  const conf = (pct) => (missing ? "LOW" : pct >= 70 && !thin ? "HIGH" : pct >= 58 ? "MEDIUM" : "LOW");
  const expHome = (sh(home, home.ppg) + sh(away, away.oppPpg)) / 2 + HOME_ADV;
  const expAway = (sh(away, away.ppg) + sh(home, home.oppPpg)) / 2;
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
          confidence: conf(homePct),
        },
        away: {
          probability: awayPct,
          confidence: conf(awayPct),
        },
      },
      totalPoints: {
        line: totalLine,
        projected: Math.round(total * 10) / 10,
      },
      sample: { homeGames: home.games || 0, awayGames: away.games || 0 },
    },
  };
}

async function main() {
  const teams = new Map();
  const statsFile = JSON.parse(fs.readFileSync("public/ncaa-team-stats.json", "utf8"));
  for (const id of Object.keys(statsFile)) {
    const e = statsFile[id];
    teams.set(Number(id), {
      id: Number(id),
      name: e.name,
      logo: null,
      ppg: e.ppg,
      oppPpg: e.oppg,
      games: e.year === 2027 ? e.games : Math.min(e.games, 10),
      prior: e.year !== 2027,
    });
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

  for (const m of scheduled) {
    const h = m.homeTeam && teams.get(m.homeTeam.id);
    const w = m.awayTeam && teams.get(m.awayTeam.id);
    if (h && !h.logo) h.logo = m.homeTeam.logo || null;
    if (w && !w.logo) w.logo = m.awayTeam.logo || null;
  }
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
