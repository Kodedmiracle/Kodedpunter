// src/basketball/generateNbaPredictions.cjs
// Phase A: standings + last-five form blend + NO_BET band
const fs = require("fs");
const {
  formFromLastFive,
  blendPpg,
  blendOpp,
} = require("./formFromLastFive.cjs");

const KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!KEY) {
  console.error("Set HIGHLIGHTLY_API_KEY first");
  process.exit(1);
}

const BASE = "https://nba.highlightly.net";
const HOME_ADV = 3.0;
const SHRINK_GAMES = 15;
const SEASON_W = 0.4;
const FORM_W = 0.6;
// NO_BET if favourite side is inside this band (too close)
const NO_BET_LOW = 52;
const NO_BET_HIGH = 58;

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
  const rank = (b) =>
    (b.year || 0) * 10 +
    (/pre/i.test(b.seasonType || "")
      ? 0
      : /post/i.test(b.seasonType || "")
        ? 1
        : 2);
  const blocks = [...(standingsBody.data || [])].sort(
    (a, b) => rank(a) - rank(b)
  );
  for (const block of blocks) {
    for (const row of block.data || []) {
      const t = row.team;
      if (!t || t.id == null) continue;
      const s = statMap(row.statistics);
      const gp = num(s["Wins"], 0) + num(s["Losses"], 0);
      if (gp === 0 && byId.has(t.id)) continue;
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
        form: null,
      });
    }
  }
  return byId;
}

function leagueAvgPpg(teams) {
  let sum = 0;
  let n = 0;
  for (const t of teams.values()) {
    if (t.wins + t.losses > 0) {
      sum += t.ppg;
      n++;
    }
  }
  return n ? sum / n : 112;
}

function homeWinProb(expectedMargin) {
  const p = 1 / (1 + Math.exp(-expectedMargin / 7));
  const capped = Math.min(0.85, Math.max(0.15, p));
  return Math.round(capped * 1000) / 10;
}

function confLabel(prob, noBet) {
  if (noBet) return "NO_BET";
  if (prob >= 65) return "HIGH";
  if (prob >= 55) return "MEDIUM";
  return "LOW";
}

function predictGame(match, teams) {
  const home = teams.get(match.homeTeam && match.homeTeam.id);
  const away = teams.get(match.awayTeam && match.awayTeam.id);
  if (!home || !away) return null;

  const lg = leagueAvgPpg(teams);
  const shrink = (t, v) => {
    const g = t.wins + t.losses;
    const w = g / (g + SHRINK_GAMES);
    return w * v + (1 - w) * lg;
  };

  // Season shrunk, then blend with L5 form when present
  let homePpg = shrink(home, home.ppg);
  let homeOpp = shrink(home, home.oppPpg);
  let awayPpg = shrink(away, away.ppg);
  let awayOpp = shrink(away, away.oppPpg);

  homePpg = blendPpg(homePpg, home.form, SEASON_W, FORM_W);
  homeOpp = blendOpp(homeOpp, home.form, SEASON_W, FORM_W);
  awayPpg = blendPpg(awayPpg, away.form, SEASON_W, FORM_W);
  awayOpp = blendOpp(awayOpp, away.form, SEASON_W, FORM_W);

  const expHome = (homePpg + awayOpp) / 2 + HOME_ADV;
  const expAway = (awayPpg + homeOpp) / 2;
  const total = expHome + expAway;
  const margin = expHome - expAway;
  const homePct = homeWinProb(margin);
  const awayPct = Math.round((100 - homePct) * 10) / 10;
  const favPct = Math.max(homePct, awayPct);
  const noBet = favPct >= NO_BET_LOW && favPct < NO_BET_HIGH;
  const totalLine = Math.round(total * 2) / 2;

  return {
    competition: "NBA",
    matchId: match.id,
    homeTeam: home.name,
    awayTeam: away.name,
    homeCrest: home.logo,
    awayCrest: away.logo,
    kickoff: match.date,
    noBet: noBet,
    form: {
      home: home.form
        ? { games: home.form.games, ppg: home.form.ppg, oppPpg: home.form.oppPpg }
        : null,
      away: away.form
        ? { games: away.form.games, ppg: away.form.ppg, oppPpg: away.form.oppPpg }
        : null,
    },
    prediction: {
      expectedPoints: {
        home: Math.round(expHome * 10) / 10,
        away: Math.round(expAway * 10) / 10,
        total: Math.round(total * 10) / 10,
      },
      moneyline: {
        home: {
          probability: homePct,
          confidence: confLabel(homePct, noBet && homePct >= awayPct),
        },
        away: {
          probability: awayPct,
          confidence: confLabel(awayPct, noBet && awayPct > homePct),
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

  // Last-five only for teams on the board (saves quota)
  const boardIds = new Set();
  for (const m of scheduled) {
    if (m.homeTeam && m.homeTeam.id != null) boardIds.add(m.homeTeam.id);
    if (m.awayTeam && m.awayTeam.id != null) boardIds.add(m.awayTeam.id);
  }
  console.log("Fetching last-five for", boardIds.size, "board teams…");
  let formOk = 0;
  for (const id of boardIds) {
    try {
      const raw = await get("/last-five-games?teamId=" + id);
      const form = formFromLastFive(id, raw);
      const t = teams.get(id);
      if (t && form) {
        t.form = form;
        formOk++;
      }
    } catch (e) {
      console.log("L5 skip", id, e.message);
    }
  }
  console.log("Form loaded for", formOk, "teams");

  const predictions = [];
  let noBetCount = 0;
  for (const m of scheduled) {
    const p = predictGame(m, teams);
    if (p) {
      if (p.noBet) noBetCount++;
      predictions.push(p);
    }
  }

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/nba-predictions.json",
    JSON.stringify(predictions, null, 2)
  );
  fs.writeFileSync(
    "public/nba-meta.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        matchCount: predictions.length,
        formTeams: formOk,
        noBetCount: noBetCount,
        phase: "A-last5",
      },
      null,
      2
    )
  );

  console.log(
    "Saved",
    predictions.length,
    "NBA predictions · form teams",
    formOk,
    "· NO_BET",
    noBetCount
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
      s.prediction.expectedPoints.total,
      s.noBet ? "| NO_BET" : ""
    );
    if (s.form && s.form.home) {
      console.log(
        "  home L5 ppg",
        s.form.home.ppg,
        "opp",
        s.form.home.oppPpg
      );
    }
  }
}

main().catch(function (e) {
  console.error(e.message);
  process.exit(1);
});
