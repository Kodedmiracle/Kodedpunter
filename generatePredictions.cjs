require('dotenv').config();
const fs = require('fs');
const { predictMatch } = require('./src/engine/poissonModel.cjs');
const {
  fetchStandings,
  fetchRecentMatches,
  teamStatsFromStanding,
  computeLeagueAvg,
  fetchUpcomingFixtures,
} = require('./src/engine/fetchTeamData.cjs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'CL', name: 'Champions League' },
];

async function processCompetition(comp, maxFixtures = 5) {
  console.log(`\n--- ${comp.name} ---`);
  const results = [];

  const table = await fetchStandings(comp.code);
  await sleep(6500);
  const leagueAvg = computeLeagueAvg(table);
  const fixtures = await fetchUpcomingFixtures(comp.code, maxFixtures);
  await sleep(6500);

  for (const fixture of fixtures) {
    const homeRow = table.find((r) => r.team.name === fixture.homeTeam);
    const awayRow = table.find((r) => r.team.name === fixture.awayTeam);
    if (!homeRow || !awayRow) {
      console.log(`Skipping ${fixture.homeTeam} vs ${fixture.awayTeam} — team not found in standings`);
      continue;
    }

    const homeStats = teamStatsFromStanding(homeRow);
    const awayStats = teamStatsFromStanding(awayRow);

    await sleep(6500);
    const homeRecent = await fetchRecentMatches(homeRow.team.id);
    await sleep(6500);
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
      competition: comp.name,
      homeTeam: fixture.homeTeam.replace(' FC', ''),
      awayTeam: fixture.awayTeam.replace(' FC', ''),
      kickoff: fixture.kickoff,
      prediction,
    });

    console.log(`Done: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
  }

  return results;
}

async function run() {
  let allResults = [];

  for (const comp of COMPETITIONS) {
    try {
      const compResults = await processCompetition(comp, 5);
      allResults = allResults.concat(compResults);
    } catch (err) {
      console.log(`Error processing ${comp.name}: ${err.message}`);
    }
  }

  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/predictions.json', JSON.stringify(allResults, null, 2));
  console.log(`\nSaved ${allResults.length} total predictions to public/predictions.json`);
}

run().catch((err) => console.error('Error:', err.message));
