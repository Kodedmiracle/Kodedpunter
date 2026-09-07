// poissonModel.js
// Core Poisson-based prediction engine for Kodedpunter

// Factorial helper for Poisson PMF
function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Poisson probability mass function: P(X = k) given mean lambda
function poissonProb(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Calculate attack/defense strength for a team relative to league average.
 * stats = { goalsFor, goalsAgainst, playedGames }
 * leagueAvg = { avgGoalsFor, avgGoalsAgainst } (per game, league-wide)
 */
function calculateStrength(stats, leagueAvg) {
  const gamesPlayed = stats.playedGames || 1;
  const avgFor = stats.goalsFor / gamesPlayed;
  const avgAgainst = stats.goalsAgainst / gamesPlayed;

  return {
    attackStrength: avgFor / leagueAvg.avgGoalsFor,
    defenseStrength: avgAgainst / leagueAvg.avgGoalsAgainst,
  };
}

/**
 * Weighted recent form modifier from last N results.
 * recentMatches = array of { goalsFor, goalsAgainst } most recent first
 * More recent matches weighted higher.
 */
function calculateFormModifier(recentMatches) {
  if (!recentMatches || recentMatches.length === 0) return 1.0;

  const weights = [0.35, 0.25, 0.2, 0.12, 0.08]; // last 5, most recent first
  let weightedFor = 0;
  let weightedAgainst = 0;
  let totalWeight = 0;

  recentMatches.slice(0, 5).forEach((match, i) => {
    const w = weights[i] || 0.05;
    weightedFor += match.goalsFor * w;
    weightedAgainst += match.goalsAgainst * w;
    totalWeight += w;
  });

  const avgFor = weightedFor / totalWeight;
  // Form modifier: >1 means scoring above their own season average
  return avgFor > 0 ? avgFor : 0.8;
}

/**
 * Expected goals for home and away team.
 * homeAdvantage: multiplier applied to home attack (typically 1.1–1.4)
 */
function calculateExpectedGoals({
  homeStrength,
  awayStrength,
  homeForm,
  awayForm,
  leagueAvg,
  homeAdvantage = 1.2,
}) {
  const homeXG =
    leagueAvg.avgGoalsFor *
    homeStrength.attackStrength *
    awayStrength.defenseStrength *
    homeAdvantage *
    (homeForm / 1.0 || 1);

  const awayXG =
    leagueAvg.avgGoalsFor *
    awayStrength.attackStrength *
    homeStrength.defenseStrength *
    (awayForm / 1.0 || 1);

  return { homeXG: Math.max(homeXG, 0.1), awayXG: Math.max(awayXG, 0.1) };
}

/**
 * Build a full scoreline probability matrix up to maxGoals each side.
 */
function buildScoreMatrix(homeXG, awayXG, maxGoals = 6) {
  const matrix = [];
  for (let h = 0; h <= maxGoals; h++) {
    const row = [];
    for (let a = 0; a <= maxGoals; a++) {
      row.push(poissonProb(homeXG, h) * poissonProb(awayXG, a));
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Derive all market probabilities from the score matrix.
 */
function deriveMarkets(matrix) {
  let homeWin = 0, draw = 0, awayWin = 0;
  let btts = 0;
  let over15 = 0, over25 = 0, over35 = 0;
  let scorelines = [];

  for (let h = 0; h < matrix.length; h++) {
    for (let a = 0; a < matrix[h].length; a++) {
      const p = matrix[h][a];
      scorelines.push({ home: h, away: a, prob: p });

      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;

      if (h > 0 && a > 0) btts += p;

      const totalGoals = h + a;
      if (totalGoals > 1.5) over15 += p;
      if (totalGoals > 2.5) over25 += p;
      if (totalGoals > 3.5) over35 += p;
    }
  }

  scorelines.sort((a, b) => b.prob - a.prob);

  return {
    matchResult: {
      homeWin: round(homeWin),
      draw: round(draw),
      awayWin: round(awayWin),
    },
    doubleChance: {
      homeOrDraw: round(homeWin + draw),
      homeOrAway: round(homeWin + awayWin),
      drawOrAway: round(draw + awayWin),
    },
    btts: {
      yes: round(btts),
      no: round(1 - btts),
    },
    overUnder: {
      over15: round(over15),
      under15: round(1 - over15),
      over25: round(over25),
      under25: round(1 - over25),
      over35: round(over35),
      under35: round(1 - over35),
    },
    topScorelines: scorelines.slice(0, 5).map((s) => ({
      score: `${s.home}-${s.away}`,
      probability: round(s.prob),
    })),
  };
}

function round(p) {
  return Math.round(p * 1000) / 10; // percentage, 1 decimal place
}

/**
 * Confidence scoring based on probability magnitude.
 * Simple threshold approach for now — will refine using sample size/data quality later.
 */
function getConfidence(probabilityPercent) {
  if (probabilityPercent >= 80) return "VERY HIGH";
  if (probabilityPercent >= 65) return "HIGH";
  if (probabilityPercent >= 50) return "MEDIUM";
  if (probabilityPercent >= 35) return "LOW";
  return "VERY LOW";
}

/**
 * Main entry point: takes raw team data, returns full prediction object.
 */
function predictMatch({
  homeTeamStats,
  awayTeamStats,
  homeRecentMatches,
  awayRecentMatches,
  leagueAvg,
  homeAdvantage = 1.2,
}) {
  const homeStrength = calculateStrength(homeTeamStats, leagueAvg);
  const awayStrength = calculateStrength(awayTeamStats, leagueAvg);

  const homeForm = calculateFormModifier(homeRecentMatches);
  const awayForm = calculateFormModifier(awayRecentMatches);

  const { homeXG, awayXG } = calculateExpectedGoals({
    homeStrength,
    awayStrength,
    homeForm,
    awayForm,
    leagueAvg,
    homeAdvantage,
  });

  const matrix = buildScoreMatrix(homeXG, awayXG);
  const markets = deriveMarkets(matrix);

  // Attach confidence to each market
  const withConfidence = {
    matchResult: mapConfidence(markets.matchResult),
    doubleChance: mapConfidence(markets.doubleChance),
    btts: mapConfidence(markets.btts),
    overUnder: mapConfidence(markets.overUnder),
    topScorelines: markets.topScorelines,
    expectedGoals: {
      home: Math.round(homeXG * 100) / 100,
      away: Math.round(awayXG * 100) / 100,
    },
  };

  return withConfidence;
}

function mapConfidence(marketObj) {
  const out = {};
  for (const [key, value] of Object.entries(marketObj)) {
    out[key] = { probability: value, confidence: getConfidence(value) };
  }
  return out;
}

module.exports = {
  predictMatch,
  calculateStrength,
  calculateFormModifier,
  calculateExpectedGoals,
  buildScoreMatrix,
  deriveMarkets,
  getConfidence,
};
