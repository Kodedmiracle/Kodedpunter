require('dotenv').config();
const fs = require('fs');
const { predictMatch } = require('./src/engine/poissonModel.cjs');
const {
  fetchStandings,
  fetchRecentMatches,
  teamStatsFromStanding,
  computeLeagueAvg,
  fetchUpcomingFixtures,
  crestFromStandings,
} = require('./src/engine/fetchTeamData.cjs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const COMPETITIONS = [
  { code: 'PL', name: 'Premier League', maxFixtures: 10 },
  { code: 'CL', name: 'Champions League', maxFixtures: 4 },
];

async function processCompetition(comp) {
  const maxFixtures = comp.maxFixtures || 5;
  console.log(`\n--- ${comp.name} ---`);
  const results = [];

  const table = await fetchStandings(comp.code);
  await sleep(6500);
  const leagueAvg = computeLeagueAvg(table);
  const fixtures = await fetchUpcomingFixtures(comp.code, maxFixtures);
  await sleep(6500);

  for (const fixture of fixtures) {
    try {
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
      matchId: fixture.id,
        homeTeam: fixture.homeTeam.replace(' FC', ''),
        awayTeam: fixture.awayTeam.replace(' FC', ''),
        homeCrest: crestFromStandings(table, fixture.homeTeam),
        awayCrest: crestFromStandings(table, fixture.awayTeam),
        kickoff: fixture.kickoff,
        prediction,
      });

      console.log(`Done: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
    } catch (err) {
      // A single flaky fetch shouldn't cost us every fixture already
      // completed for this competition — skip this one match and continue.
      console.log(`Skipped ${fixture.homeTeam} vs ${fixture.awayTeam} — ${err.message}`);
    }
  }

  return results;
}

async function run() {
  let allResults = [];

  for (const comp of COMPETITIONS) {
    try {
      const compResults = await processCompetition(comp);
      allResults = allResults.concat(compResults);
    } catch (err) {
      // Only reaches here if standings/fixtures themselves fail to load —
      // per-fixture errors are now caught above and don't propagate up.
      console.log(`Error processing ${comp.name}: ${err.message}`);
    }
  }

  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/predictions.json', JSON.stringify(allResults, null, 2));
  console.log(`\nSaved ${allResults.length} total predictions to public/predictions.json`);
}

run().catch((err) => console.error('Error:', err.message));
