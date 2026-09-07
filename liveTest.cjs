require('dotenv').config();
const { predictMatch } = require('./src/engine/poissonModel.js');
const {
  fetchStandings,
  fetchRecentMatches,
  teamStatsFromStanding,
  computeLeagueAvg,
} = require('./src/engine/fetchTeamData.js');

async function run() {
  const table = await fetchStandings('PL');
  const leagueAvg = computeLeagueAvg(table);

  // Pick two teams by name — change these to whichever teams you want to test
  const homeName = 'Chelsea FC';
  const awayName = 'Liverpool FC';

  const homeRow = table.find((r) => r.team.name === homeName);
  const awayRow = table.find((r) => r.team.name === awayName);

  if (!homeRow || !awayRow) {
    console.log('Team not found. Available teams:');
    table.forEach((r) => console.log('-', r.team.name));
    return;
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

  console.log(`${homeName} vs ${awayName}`);
  console.log(JSON.stringify(prediction, null, 2));
}

run().catch((err) => console.error('Error:', err.message));
