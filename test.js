const { predictMatch } = require('./src/engine/poissonModel.js');

// Fake but realistic data: Arsenal (home) vs Chelsea (away)
const result = predictMatch({
  homeTeamStats: { goalsFor: 24, goalsAgainst: 10, playedGames: 12 },
  awayTeamStats: { goalsFor: 18, goalsAgainst: 14, playedGames: 12 },
  homeRecentMatches: [
    { goalsFor: 3, goalsAgainst: 1 },
    { goalsFor: 2, goalsAgainst: 0 },
    { goalsFor: 1, goalsAgainst: 1 },
    { goalsFor: 2, goalsAgainst: 1 },
    { goalsFor: 3, goalsAgainst: 0 },
  ],
  awayRecentMatches: [
    { goalsFor: 1, goalsAgainst: 1 },
    { goalsFor: 2, goalsAgainst: 2 },
    { goalsFor: 0, goalsAgainst: 1 },
    { goalsFor: 1, goalsAgainst: 0 },
    { goalsFor: 2, goalsAgainst: 1 },
  ],
  leagueAvg: { avgGoalsFor: 1.4, avgGoalsAgainst: 1.4 },
  homeAdvantage: 1.2,
});

console.log(JSON.stringify(result, null, 2));
