require('dotenv').config();
const fs = require('fs');
const { predictMatch } = require('./src/engine/poissonModel.cjs');
const {
  fetchStandings,
  fetchRecentMatches,
  teamStatsFromStanding,
  computeLeagueAvg,
} = require('./src/engine/fetchTeamData.cjs');

// A few fixed matchups to start — we'll pull real upcoming fixtures later
const FIXTURES = [
  { home: 'Chelsea FC', away: 'Liverpool FC' },
  { home: 'Arsenal FC', away: 'Manchester City FC' },
  { home: 'Manchester United FC', away: 'Tottenham Hotspur FC' },
];

async function run() {
  const table = await fetchStandings('PL');
  const leagueAvg = computeLeagueAvg(table);
  const results = [];

  for (const fixture of FIXTURES) {
    const homeRow = table.find((r) => r.team.name === fixture.home);
    const awayRow = table.find((r) => r.team.name === fixture.away);
    if (!homeRow || !awayRow) {
      console.log(`Skipping ${fixture.home} vs ${fixture.away} — team not found`);
      continue;
    }

    const homeStats = teamStatsFromStanding(homeRow);
    const awayStats = teamStatsFromStanding(awayRow);
    const homeRecent = await fetchRecentMatches(homeRow.team.id);
    const awayRecent = await fetchRecentMatches(awayRow.team.id);

    const prediction = predictMatch({
      homeTeamStats: homeStats,
      awayTeamStats: awayStats,
      homeRecentMatches: homeRecent,
      awayRecentMatches: awayRecent,
      leagueAvg,
      homeAdvantage: 1.2,
    });

    results.push({
      homeTeam: fixture.home.replace(' FC', ''),
      awayTeam: fixture.away.replace(' FC', ''),
      prediction,
    });

    console.log(`Done: ${fixture.home} vs ${fixture.away}`);
  }

  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/predictions.json', JSON.stringify(results, null, 2));
  console.log('Saved to public/predictions.json');
}

run().catch((err) => console.error('Error:', err.message));
