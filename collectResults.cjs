require('dotenv').config({ quiet: true });
const fs = require('fs');

const KEY = process.env.API_FOOTBALL_KEY;
const BASE = 'https://v3.football.api-sports.io';
const DONE = ['FT', 'AET', 'PEN'];

async function fixturesFor(offsetDays) {
  const d = new Date(Date.now() + 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
  const r = await fetch(`${BASE}/fixtures?date=${d}&timezone=Africa/Lagos`, {
    headers: { 'x-apisports-key': KEY },
  });
  const j = await r.json();
  if (j.errors && Object.keys(j.errors).length) throw new Error(JSON.stringify(j.errors));
  return j.response || [];
}

(async () => {
  if (!KEY) throw new Error('API_FOOTBALL_KEY missing');
  fs.mkdirSync('data', { recursive: true });

  const yesterday = await fixturesFor(-1);
  const today = await fixturesFor(0);
  const tomorrow = await fixturesFor(1);

  const upcoming = [...today, ...tomorrow].map((f) => ({
    id: f.fixture.id,
    kickoff: f.fixture.date,
    league: f.league.id,
    leagueName: f.league.name,
    country: f.league.country,
    season: f.league.season,
    home: f.teams.home.id,
    homeName: f.teams.home.name,
    homeLogo: f.teams.home.logo,
    away: f.teams.away.id,
    awayName: f.teams.away.name,
    awayLogo: f.teams.away.logo,
  }));
  fs.writeFileSync('data/upcoming.json', JSON.stringify(upcoming));

  const wanted = new Set(upcoming.map((u) => u.league));
  const file = 'data/results.json';
  const stored = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const seen = new Set(stored.map((r) => r.id));

  let finished = 0;
  let added = 0;
  yesterday.forEach((f) => {
    if (!DONE.includes(f.fixture.status.short)) return;
    finished++;
    if (!wanted.has(f.league.id) || seen.has(f.fixture.id)) return;
    stored.push({
      id: f.fixture.id,
      d: f.fixture.date.slice(0, 10),
      lg: f.league.id,
      h: f.teams.home.id,
      a: f.teams.away.id,
      gh: f.goals.home,
      ga: f.goals.away,
    });
    added++;
  });
  fs.writeFileSync(file, JSON.stringify(stored));

  console.log('Upcoming saved:', upcoming.length, '| leagues:', wanted.size);
  console.log('Yesterday finished:', finished, '| kept:', added);
  console.log('Total results stored:', stored.length);
})().catch((e) => console.log('FAILED:', e.message));
