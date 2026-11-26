const test = require("node:test");
const assert = require("node:assert/strict");
const {
  predictMatch,
  decayWeight,
  calculateFormModifier,
} = require("../src/engine/poissonModel.cjs");

const league = { avgGoalsFor: 1.4, avgGoalsAgainst: 1.4 };
const season = { goalsFor: 20, goalsAgainst: 16, playedGames: 12 };

test("outcome probabilities sum to about 100", () => {
  const pred = predictMatch({
    homeTeamStats: season,
    awayTeamStats: { goalsFor: 16, goalsAgainst: 18, playedGames: 12 },
    homeRecentMatches: [],
    awayRecentMatches: [],
    leagueAvg: league,
  });
  const r = pred.matchResult;
  const sum = r.homeWin.probability + r.draw.probability + r.awayWin.probability;
  assert.ok(Math.abs(sum - 100) < 0.2, "sum was " + sum);
  assert.ok(pred.expectedGoals.home > 0);
  assert.ok(pred.expectedGoals.away > 0);
});

test("exponential decay halves the weight at one half-life", () => {
  assert.ok(Math.abs(decayWeight(21, 21) - 0.5) < 1e-9);
  assert.ok(decayWeight(0, 21) === 1);
});

test("a newer scoring run lifts the form modifier more than an old one", () => {
  const fresh = calculateFormModifier(
    [{ goalsFor: 3, daysAgo: 1 }, { goalsFor: 0, daysAgo: 40 }],
    1.2
  );
  const stale = calculateFormModifier(
    [{ goalsFor: 0, daysAgo: 1 }, { goalsFor: 3, daysAgo: 40 }],
    1.2
  );
  assert.ok(fresh > stale);
});

test("a defence that has been leaking raises the opponent's expected goals", () => {
  const tight = [
    { goalsFor: 1, goalsAgainst: 0, daysAgo: 3 },
    { goalsFor: 1, goalsAgainst: 0, daysAgo: 10 },
    { goalsFor: 2, goalsAgainst: 1, daysAgo: 17 },
  ];
  const leaky = [
    { goalsFor: 1, goalsAgainst: 4, daysAgo: 3 },
    { goalsFor: 1, goalsAgainst: 3, daysAgo: 10 },
    { goalsFor: 2, goalsAgainst: 4, daysAgo: 17 },
  ];
  const againstLeaky = predictMatch({
    homeTeamStats: season,
    awayTeamStats: season,
    homeRecentMatches: tight,
    awayRecentMatches: leaky,
    leagueAvg: league,
  });
  const againstTight = predictMatch({
    homeTeamStats: season,
    awayTeamStats: season,
    homeRecentMatches: tight,
    awayRecentMatches: tight,
    leagueAvg: league,
  });
  assert.ok(againstLeaky.expectedGoals.home > againstTight.expectedGoals.home);
});
