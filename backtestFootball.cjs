// Walk-forward backtest of the football 1X2 model.
// Uses only matches already in data/history.json and data/results.json.
// For each fixture, season totals and the last few games are taken from
// earlier dates in the same league, which is the same information the live
// model gets from a league table plus recent results.
//
// Hyperparameters in src/engine/poissonModel.cjs were chosen with --grid on
// the training window only. The numbers printed by a plain run are that
// locked model versus the frozen legacy model, on the later window.

const fs = require("fs");
const { predictMatch, DEFAULTS } = require("./src/engine/poissonModel.cjs");
const { predictMatch: legacyPredict } = require("./src/engine/legacyPoisson.cjs");

const MIN_GAMES = 5;
const RECENT_KEEP = 8;

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function loadMatches() {
  const history = readJson("data/history.json", { results: [] }).results || [];
  const recent = readJson("data/results.json", []);
  const seen = new Set();
  const rows = [];
  for (const r of [...history, ...recent]) {
    if (r.gh == null || r.ga == null || !r.d || r.h == null || r.a == null || r.lg == null) continue;
    const id = r.id != null ? "id:" + r.id : [r.lg, r.d, r.h, r.a, r.gh, r.ga].join(":");
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      lg: r.lg,
      d: String(r.d).slice(0, 10),
      h: r.h,
      a: r.a,
      gh: r.gh,
      ga: r.ga,
    });
  }
  rows.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
  return rows;
}

function seasonStart(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  const startYear = m >= 7 ? y : y - 1;
  return startYear + "-07-01";
}

function outcomeOf(gh, ga) {
  if (gh > ga) return "home";
  if (gh < ga) return "away";
  return "draw";
}

function emptyTeam() {
  return { gf: 0, ga: 0, n: 0, recent: [], season: "" };
}

function buildSamples(rows) {
  const leagues = new Map();
  for (const row of rows) {
    if (!leagues.has(row.lg)) leagues.set(row.lg, []);
    leagues.get(row.lg).push(row);
  }

  const samples = [];
  for (const [lg, matches] of leagues) {
    const teams = new Map();
    let leagueGoals = 0;
    let leagueGames = 0;
    let leagueSeason = "";
    let i = 0;
    while (i < matches.length) {
      const day = matches[i].d;
      let j = i;
      while (j < matches.length && matches[j].d === day) j++;
      const todays = matches.slice(i, j);
      const daySeason = seasonStart(day);
      if (daySeason !== leagueSeason) {
        leagueGoals = 0;
        leagueGames = 0;
        leagueSeason = daySeason;
      }

      for (const m of todays) {
        const season = seasonStart(m.d);
        const home = teams.get(m.h) || emptyTeam();
        const away = teams.get(m.a) || emptyTeam();
        if (home.season !== season) {
          home.gf = 0;
          home.ga = 0;
          home.n = 0;
          home.season = season;
        }
        if (away.season !== season) {
          away.gf = 0;
          away.ga = 0;
          away.n = 0;
          away.season = season;
        }
        if (home.n >= MIN_GAMES && away.n >= MIN_GAMES && leagueGames > 0) {
          const avg = leagueGoals / leagueGames;
          samples.push({
            date: m.d,
            league: lg,
            outcome: outcomeOf(m.gh, m.ga),
            leagueAvg: { avgGoalsFor: avg, avgGoalsAgainst: avg },
            homeTeamStats: { goalsFor: home.gf, goalsAgainst: home.ga, playedGames: home.n },
            awayTeamStats: { goalsFor: away.gf, goalsAgainst: away.ga, playedGames: away.n },
            homeRecentMatches: home.recent.slice(0, RECENT_KEEP).map((g) => ({ ...g })),
            awayRecentMatches: away.recent.slice(0, RECENT_KEEP).map((g) => ({ ...g })),
            asOf: m.d,
          });
        }
      }

      for (const m of todays) {
        const season = seasonStart(m.d);
        const home = teams.get(m.h) || emptyTeam();
        const away = teams.get(m.a) || emptyTeam();
        if (home.season !== season) {
          home.gf = 0;
          home.ga = 0;
          home.n = 0;
          home.recent = [];
          home.season = season;
        }
        if (away.season !== season) {
          away.gf = 0;
          away.ga = 0;
          away.n = 0;
          away.recent = [];
          away.season = season;
        }
        home.gf += m.gh;
        home.ga += m.ga;
        home.n += 1;
        home.recent.unshift({ goalsFor: m.gh, goalsAgainst: m.ga, date: m.d });
        if (home.recent.length > RECENT_KEEP) home.recent.pop();
        away.gf += m.ga;
        away.ga += m.gh;
        away.n += 1;
        away.recent.unshift({ goalsFor: m.ga, goalsAgainst: m.gh, date: m.d });
        if (away.recent.length > RECENT_KEEP) away.recent.pop();
        teams.set(m.h, home);
        teams.set(m.a, away);
        leagueGoals += m.gh + m.ga;
        leagueGames += 2;
      }

      i = j;
    }
  }

  samples.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return samples;
}

function probsFromPrediction(pred) {
  const m = pred.matchResult;
  const home = m.homeWin.probability;
  const draw = m.draw.probability;
  const away = m.awayWin.probability;
  const sum = home + draw + away;
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

function score(samples, predict) {
  let n = 0;
  let hits = 0;
  let brier = 0;
  let logLoss = 0;
  for (const s of samples) {
    const pred = predict(s);
    const p = probsFromPrediction(pred);
    const y = { home: 0, draw: 0, away: 0 };
    y[s.outcome] = 1;
    const order = ["home", "draw", "away"];
    let pick = "home";
    for (const k of order) if (p[k] > p[pick]) pick = k;
    if (pick === s.outcome) hits++;
    let bs = 0;
    for (const k of order) {
      const d = p[k] - y[k];
      bs += d * d;
    }
    brier += bs;
    const py = Math.min(1 - 1e-15, Math.max(1e-15, p[s.outcome]));
    logLoss += -Math.log(py);
    n++;
  }
  return {
    n,
    hitRate: n ? hits / n : 0,
    brier: n ? brier / n : 0,
    logLoss: n ? logLoss / n : 0,
  };
}

function predictNew(sample, model) {
  return predictMatch({
    homeTeamStats: sample.homeTeamStats,
    awayTeamStats: sample.awayTeamStats,
    homeRecentMatches: sample.homeRecentMatches,
    awayRecentMatches: sample.awayRecentMatches,
    leagueAvg: sample.leagueAvg,
    asOf: sample.asOf,
    model,
  });
}

function predictOld(sample) {
  return legacyPredict({
    homeTeamStats: sample.homeTeamStats,
    awayTeamStats: sample.awayTeamStats,
    homeRecentMatches: sample.homeRecentMatches,
    awayRecentMatches: sample.awayRecentMatches,
    leagueAvg: sample.leagueAvg,
    homeAdvantage: 1.2,
  });
}

function splitSamples(samples) {
  const cut = Math.floor(samples.length * 0.7);
  const cutoff = samples[Math.min(samples.length - 1, cut)].date;
  const train = samples.filter((s) => s.date < cutoff);
  const test = samples.filter((s) => s.date >= cutoff);
  return { train, test, cutoff };
}

function fmt(m) {
  return {
    n: m.n,
    hitRate: +(m.hitRate * 100).toFixed(2),
    brier: +m.brier.toFixed(4),
    logLoss: +m.logLoss.toFixed(4),
  };
}

function gridSearch(train) {
  const space = {
    formBlend: [0, 0.15, 0.3, 0.45, 0.6],
    halfLifeDays: [10, 21, 40, 80],
    xgShrink: [0.7, 0.85, 1],
    rho: [-0.15, -0.08, -0.03, 0],
    homeAdvantage: [1.05, 1.12, 1.2, 1.28],
  };
  let best = { ...DEFAULTS };
  let bestLoss = Infinity;
  const trace = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const key of Object.keys(space)) {
      let localBest = best[key];
      let localLoss = Infinity;
      for (const value of space[key]) {
        const model = { ...best, [key]: value };
        const loss = score(train, (s) => predictNew(s, model)).logLoss;
        if (loss < localLoss) {
          localLoss = loss;
          localBest = value;
        }
      }
      best = { ...best, [key]: localBest };
      bestLoss = localLoss;
      trace.push({ pass, key, value: localBest, logLoss: +localLoss.toFixed(4) });
    }
  }
  return { best, bestLoss, trace };
}

function main() {
  const rows = loadMatches();
  const samples = buildSamples(rows);
  const { train, test, cutoff } = splitSamples(samples);
  const doGrid = process.argv.includes("--grid");

  let selected = { ...DEFAULTS };
  let trace = null;
  if (doGrid) {
    const found = gridSearch(train);
    selected = found.best;
    trace = found.trace;
    console.log("Train-selected params:", JSON.stringify(selected));
  }

  const trainOld = score(train, predictOld);
  const trainNew = score(train, (s) => predictNew(s, selected));
  const testOld = score(test, predictOld);
  const testNew = score(test, (s) => predictNew(s, selected));

  const summary = {
    generatedAt: new Date().toISOString(),
    dataset: {
      source: "data/history.json results plus data/results.json",
      fixturesLoaded: rows.length,
      scored: samples.length,
      minSeasonGames: MIN_GAMES,
      train: train.length,
      test: test.length,
      trainEndsBefore: cutoff,
    },
    selection: doGrid
      ? "Coordinate descent on training log loss. Test window was not used to pick parameters."
      : "Production defaults from src/engine/poissonModel.cjs, previously chosen on the training window only.",
    params: selected,
    gridTrace: trace,
    metrics: {
      definition:
        "Hit rate is the share of matches where the most likely home/draw/away outcome happened. Brier is the average sum of squared errors across the three outcomes (lower is better, range 0 to 2). Log loss is the average negative log probability of the actual outcome (lower is better).",
      train: { legacy: fmt(trainOld), new: fmt(trainNew) },
      test: { legacy: fmt(testOld), new: fmt(testNew) },
    },
    marketBlend:
      "Not in these numbers. The historical files do not contain bookmaker odds. Live pages blend de-vigged SportyBet 1X2 prices when that feed answers.",
    information:
      "Each prediction uses only earlier matches in the same league: season-to-date goals and the last eight results. Same-day matches are not used as inputs.",
  };

  fs.writeFileSync("data/backtest-summary.json", JSON.stringify(summary, null, 2) + "\n");

  console.log("Samples", samples.length, "train", train.length, "test", test.length, "cutoff", cutoff);
  console.log("TEST legacy", fmt(testOld));
  console.log("TEST new   ", fmt(testNew));
  console.log("TRAIN legacy", fmt(trainOld));
  console.log("TRAIN new   ", fmt(trainNew));
  const better =
    testNew.logLoss < testOld.logLoss && testNew.brier < testOld.brier;
  console.log(better ? "Test log loss and Brier improved." : "Test scores did not both improve.");
}

main();
