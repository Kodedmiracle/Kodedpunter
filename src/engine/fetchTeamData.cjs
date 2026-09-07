// fetchTeamData.cjs
// Fetches live team stats + recent form from football-data.org

const API_TOKEN = process.env.FOOTBALL_API_KEY;
const BASE_URL = "https://api.football-data.org/v4";

async function fetchStandings(competitionCode) {
  const res = await fetch(`${BASE_URL}/competitions/${competitionCode}/standings`, {
    headers: { "X-Auth-Token": API_TOKEN },
  });
  if (!res.ok) throw new Error(`Standings fetch failed: ${res.status}`);
  const data = await res.json();
  return data.standings[0].table;
}

async function fetchRecentMatches(teamId, limit = 5) {
  const res = await fetch(
    `${BASE_URL}/teams/${teamId}/matches?status=FINISHED&limit=${limit}`,
    { headers: { "X-Auth-Token": API_TOKEN } }
  );
  if (!res.ok) throw new Error(`Recent matches fetch failed: ${res.status}`);
  const data = await res.json();

  return data.matches.map((m) => {
    const isHome = m.homeTeam.id === teamId;
    const goalsFor = isHome ? m.score.fullTime.home : m.score.fullTime.away;
    const goalsAgainst = isHome ? m.score.fullTime.away : m.score.fullTime.home;
    return { goalsFor, goalsAgainst };
  });
}

async function fetchUpcomingFixtures(competitionCode, limit = 5) {
  const res = await fetch(
    `${BASE_URL}/competitions/${competitionCode}/matches?status=SCHEDULED`,
    { headers: { "X-Auth-Token": API_TOKEN } }
  );
  if (!res.ok) throw new Error(`Fixtures fetch failed: ${res.status}`);
  const data = await res.json();

  return data.matches.slice(0, limit).map((m) => ({
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    kickoff: m.utcDate,
  }));
}

function teamStatsFromStanding(standingRow) {
  return {
    goalsFor: standingRow.goalsFor,
    goalsAgainst: standingRow.goalsAgainst,
    playedGames: standingRow.playedGames,
  };
}

function computeLeagueAvg(table) {
  let totalGoals = 0;
  let totalGames = 0;
  table.forEach((row) => {
    totalGoals += row.goalsFor;
    totalGames += row.playedGames;
  });
  const avg = totalGames > 0 ? totalGoals / totalGames : 1.4;
  return { avgGoalsFor: avg, avgGoalsAgainst: avg };
}

module.exports = {
  fetchStandings,
  fetchRecentMatches,
  teamStatsFromStanding,
  computeLeagueAvg,
  fetchUpcomingFixtures,
};
