// Goal model for Kodedpunter.
// Attack and defence come from season results, shrunk toward average.
// Recent matches are mixed in with exponential decay (newer games count more)
// and both goals scored and conceded are used. Expected goals feed a
// Dixon-Coles adjustment of the Poisson score grid. A shrink step pulls
// extreme score rates back toward the league, which is how the probabilities
// were calibrated on historical matches.

const { confidenceLabel } = require("./marketOdds.cjs");

// Chosen on the training portion of data/history.json + data/results.json
// by coordinate descent on log loss. See backtestFootball.cjs. Do not retune
// these on the held-out window.
const DEFAULTS = {
  halfLifeDays: 21,
  formBlend: 0.3,
  rho: -0.08,
  homeAdvantage: 1.28,
  xgShrink: 0.7,
  maxGoals: 10,
};

function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonProb(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

const FULL_CONFIDENCE_GAMES = 10;

function calculateStrength(stats, leagueAvg) {
  if (!stats.playedGames || stats.playedGames === 0) {
    return { attackStrength: 1.0, defenseStrength: 1.0 };
  }

  const avgFor = stats.goalsFor / stats.playedGames;
  const avgAgainst = stats.goalsAgainst / stats.playedGames;
  const leagueFor = leagueAvg.avgGoalsFor || 1.35;
  const leagueAgainst = leagueAvg.avgGoalsAgainst || leagueFor;

  const rawAttack = avgFor / leagueFor;
  const rawDefense = avgAgainst / leagueAgainst;
  const confidence = Math.min(stats.playedGames / FULL_CONFIDENCE_GAMES, 1);

  return {
    attackStrength: rawAttack * confidence + 1.0 * (1 - confidence),
    defenseStrength: rawDefense * confidence + 1.0 * (1 - confidence),
  };
}

function ageDays(match, index, asOfMs) {
  if (match && Number.isFinite(match.daysAgo)) return Math.max(0, match.daysAgo);
  if (match && match.date && asOfMs) {
    const t = new Date(match.date).getTime();
    if (Number.isFinite(t)) return Math.max(0, (asOfMs - t) / 86400000);
  }
  return (index + 0.5) * 7;
}

function decayWeight(days, halfLifeDays) {
  const life = halfLifeDays > 0 ? halfLifeDays : 21;
  return Math.pow(0.5, Math.max(0, days) / life);
}

// Kept for callers and tests. Uses exponential decay when dates or daysAgo
// are present, and counts goals conceded as well as goals scored.
function calculateFormModifier(recentMatches, seasonAvgGoalsFor, options = {}) {
  if (!recentMatches || recentMatches.length === 0) return 1.0;
  const halfLife = options.halfLifeDays || DEFAULTS.halfLifeDays;
  const asOfMs = options.asOf ? new Date(options.asOf).getTime() : Date.now();
  let weightedFor = 0;
  let totalWeight = 0;
  recentMatches.slice(0, 8).forEach((match, i) => {
    const w = decayWeight(ageDays(match, i, asOfMs), halfLife);
    const gf = Number(match.goalsFor);
    if (!Number.isFinite(gf)) return;
    weightedFor += gf * w;
    totalWeight += w;
  });
  if (totalWeight <= 0) return 1.0;
  const recentAvg = weightedFor / totalWeight;
  const ratio = seasonAvgGoalsFor > 0 ? recentAvg / seasonAvgGoalsFor : 1.0;
  return Math.max(0.6, Math.min(1.6, ratio));
}

function recentStrength(recentMatches, leagueAvg, halfLifeDays, asOfMs) {
  if (!recentMatches || recentMatches.length === 0) return null;
  const leagueFor = leagueAvg.avgGoalsFor || 1.35;
  const leagueAgainst = leagueAvg.avgGoalsAgainst || leagueFor;
  let weight = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let sawAgainst = false;

  recentMatches.slice(0, 8).forEach((match, i) => {
    const gf = Number(match.goalsFor);
    if (!Number.isFinite(gf)) return;
    const w = decayWeight(ageDays(match, i, asOfMs), halfLifeDays);
    weight += w;
    goalsFor += w * gf;
    const ga = Number(match.goalsAgainst);
    if (Number.isFinite(ga)) {
      sawAgainst = true;
      goalsAgainst += w * ga;
    }
  });

  if (weight <= 0) return null;
  const trust = weight / (weight + 3);
  const rawAttack = goalsFor / weight / leagueFor;
  const attackStrength = rawAttack * trust + 1 * (1 - trust);
  let defenseStrength = null;
  if (sawAgainst) {
    const rawDefense = goalsAgainst / weight / leagueAgainst;
    defenseStrength = rawDefense * trust + 1 * (1 - trust);
  }
  return { attackStrength, defenseStrength, weight };
}

function blendStrength(season, recent, formBlend) {
  if (!recent) return season;
  const b = Math.min(1, Math.max(0, formBlend));
  return {
    attackStrength: (1 - b) * season.attackStrength + b * recent.attackStrength,
    defenseStrength:
      recent.defenseStrength == null
        ? season.defenseStrength
        : (1 - b) * season.defenseStrength + b * recent.defenseStrength,
  };
}

function calculateExpectedGoals({
  homeStrength,
  awayStrength,
  leagueAvg,
  homeAdvantage = DEFAULTS.homeAdvantage,
  xgShrink = DEFAULTS.xgShrink,
}) {
  const avg = leagueAvg.avgGoalsFor || 1.35;
  let homeXG =
    avg * homeStrength.attackStrength * awayStrength.defenseStrength * homeAdvantage;
  let awayXG = avg * awayStrength.attackStrength * homeStrength.defenseStrength;

  const shrink = Math.min(1, Math.max(0.5, xgShrink));
  const baseHome = avg * homeAdvantage;
  const baseAway = avg;
  homeXG = baseHome + (homeXG - baseHome) * shrink;
  awayXG = baseAway + (awayXG - baseAway) * shrink;

  return {
    homeXG: Math.min(4.5, Math.max(0.15, homeXG)),
    awayXG: Math.min(4.5, Math.max(0.15, awayXG)),
  };
}

function tau(homeGoals, awayGoals, homeXG, awayXG, rho) {
  let factor = 1;
  if (homeGoals === 0 && awayGoals === 0) factor = 1 - homeXG * awayXG * rho;
  else if (homeGoals === 0 && awayGoals === 1) factor = 1 + homeXG * rho;
  else if (homeGoals === 1 && awayGoals === 0) factor = 1 + awayXG * rho;
  else if (homeGoals === 1 && awayGoals === 1) factor = 1 - rho;
  return factor < 0 ? 0 : factor;
}

function buildScoreMatrix(homeXG, awayXG, maxGoals = DEFAULTS.maxGoals, rho = DEFAULTS.rho) {
  const matrix = [];
  let total = 0;

  for (let h = 0; h <= maxGoals; h++) {
    const row = [];
    for (let a = 0; a <= maxGoals; a++) {
      const raw = poissonProb(homeXG, h) * poissonProb(awayXG, a);
      const adjusted = raw * tau(h, a, homeXG, awayXG, rho);
      row.push(adjusted);
      total += adjusted;
    }
    matrix.push(row);
  }

  if (total > 0) {
    for (let h = 0; h < matrix.length; h++) {
      for (let a = 0; a < matrix[h].length; a++) {
        matrix[h][a] = matrix[h][a] / total;
      }
    }
  }

  return matrix;
}

function deriveMarkets(matrix) {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let btts = 0;
  let over05 = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  const scorelines = [];

  for (let h = 0; h < matrix.length; h++) {
    for (let a = 0; a < matrix[h].length; a++) {
      const p = matrix[h][a];
      scorelines.push({ home: h, away: a, prob: p });
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
      if (h > 0 && a > 0) btts += p;
      const totalGoals = h + a;
      if (totalGoals > 0.5) over05 += p;
      if (totalGoals > 1.5) over15 += p;
      if (totalGoals > 2.5) over25 += p;
      if (totalGoals > 3.5) over35 += p;
    }
  }

  scorelines.sort((a, b) => b.prob - a.prob);

  return {
    matchResult: { homeWin, draw, awayWin },
    doubleChance: {
      homeOrDraw: homeWin + draw,
      homeOrAway: homeWin + awayWin,
      drawOrAway: draw + awayWin,
    },
    btts: { yes: btts, no: 1 - btts },
    overUnder: {
      over05,
      under05: 1 - over05,
      over15,
      under15: 1 - over15,
      over25,
      under25: 1 - over25,
      over35,
      under35: 1 - over35,
    },
    topScorelines: scorelines.slice(0, 5).map((s) => ({
      score: `${s.home}-${s.away}`,
      probability: roundPct(s.prob),
    })),
  };
}

function roundPct(p) {
  return Math.round(p * 1000) / 10;
}

function mapConfidence(marketObj) {
  const out = {};
  for (const [key, value] of Object.entries(marketObj)) {
    const probability = roundPct(value);
    out[key] = { probability, confidence: confidenceLabel(probability) };
  }
  return out;
}

function resolveModel(model) {
  if (!model) return { ...DEFAULTS };
  return { ...DEFAULTS, ...model };
}

function ratesFor(input) {
  const model = resolveModel(input.model);
  const asOfMs = input.asOf ? new Date(input.asOf).getTime() : Date.now();
  const leagueAvg = input.leagueAvg || { avgGoalsFor: 1.35, avgGoalsAgainst: 1.35 };

  const homeSeason = calculateStrength(input.homeTeamStats || {}, leagueAvg);
  const awaySeason = calculateStrength(input.awayTeamStats || {}, leagueAvg);
  const homeRecent = recentStrength(
    input.homeRecentMatches,
    leagueAvg,
    model.halfLifeDays,
    asOfMs
  );
  const awayRecent = recentStrength(
    input.awayRecentMatches,
    leagueAvg,
    model.halfLifeDays,
    asOfMs
  );

  const homeStrength = blendStrength(homeSeason, homeRecent, model.formBlend);
  const awayStrength = blendStrength(awaySeason, awayRecent, model.formBlend);

  return calculateExpectedGoals({
    homeStrength,
    awayStrength,
    leagueAvg,
    homeAdvantage: model.homeAdvantage,
    xgShrink: model.xgShrink,
  });
}

function predictMatch(input) {
  const model = resolveModel(input.model);
  const { homeXG, awayXG } = ratesFor(input);
  const matrix = buildScoreMatrix(homeXG, awayXG, model.maxGoals, model.rho);
  const markets = deriveMarkets(matrix);

  return {
    matchResult: mapConfidence(markets.matchResult),
    doubleChance: mapConfidence(markets.doubleChance),
    btts: mapConfidence(markets.btts),
    overUnder: mapConfidence(markets.overUnder),
    topScorelines: markets.topScorelines,
    expectedGoals: {
      home: Math.round(homeXG * 100) / 100,
      away: Math.round(awayXG * 100) / 100,
    },
    scoreMatrix: matrix.map((row) => row.map((p) => Math.round(p * 1000) / 10)),
  };
}

function predictFromXG(homeXG, awayXG, model) {
  const opts = resolveModel(model);
  const hx = Math.min(4.5, Math.max(0.15, homeXG));
  const ax = Math.min(4.5, Math.max(0.15, awayXG));
  const matrix = buildScoreMatrix(hx, ax, opts.maxGoals, opts.rho);
  const markets = deriveMarkets(matrix);
  return {
    matchResult: mapConfidence(markets.matchResult),
    doubleChance: mapConfidence(markets.doubleChance),
    btts: mapConfidence(markets.btts),
    overUnder: mapConfidence(markets.overUnder),
    topScorelines: markets.topScorelines,
    expectedGoals: {
      home: Math.round(hx * 100) / 100,
      away: Math.round(ax * 100) / 100,
    },
    scoreMatrix: matrix.map((row) => row.map((p) => Math.round(p * 1000) / 10)),
  };
}

function getConfidence(probabilityPercent) {
  return confidenceLabel(probabilityPercent);
}

module.exports = {
  DEFAULTS,
  predictMatch,
  predictFromXG,
  calculateStrength,
  calculateFormModifier,
  calculateExpectedGoals,
  buildScoreMatrix,
  deriveMarkets,
  getConfidence,
  decayWeight,
  recentStrength,
};
