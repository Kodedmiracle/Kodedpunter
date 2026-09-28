require('dotenv').config({ quiet: true });
const fs = require('fs');
require('dns').setDefaultResultOrder('ipv4first');

const KEY = process.env.API_FOOTBALL_KEY;
const BASE = 'https://v3.football.api-sports.io';
const MAX_CALLS = 35;
const DONE = ['FT', 'AET', 'PEN'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!KEY) throw new Error('API_FOOTBALL_KEY missing');
  const upcoming = JSON.parse(fs.readFileSync('data/upcoming.json', 'utf8'));
  const leagues = new Map();
  upcoming.forEach((u) => leagues.set(u.league, u.country + ' - ' + u.leagueName));

  const file = 'data/history.json';
  const hist = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { done: [], results: [] };

  const todo = [...leagues.entries()].filter(([id]) => !hist.done.includes(id));
  console.log('Leagues total:', leagues.size, '| still to fetch:', todo.length);

  let calls = 0;
  for (const [id, name] of todo) {
    if (calls >= MAX_CALLS) break;
    let j;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(`${BASE}/fixtures?league=${id}&season=2024`, {
          headers: { 'x-apisports-key': KEY },
        });
        j = await r.json();
        break;
      } catch (e) {
        console.log('retry', attempt, 'for', name, '-', e.message);
        await sleep(3000 * attempt);
      }
    }
    calls++;
    if (!j) {
      console.log('skipping', name);
      continue;
    }
    if (j.errors && Object.keys(j.errors).length) {
      console.log('STOP at', name, JSON.stringify(j.errors).slice(0, 100));
      break;
    }
    let kept = 0;
    (j.response || []).forEach((f) => {
      if (!DONE.includes(f.fixture.status.short)) return;
      hist.results.push({
        lg: id,
        d: f.fixture.date.slice(0, 10),
        h: f.teams.home.id,
        a: f.teams.away.id,
        gh: f.goals.home,
        ga: f.goals.away,
      });
      kept++;
    });
    hist.done.push(id);
    fs.writeFileSync(file, JSON.stringify(hist));
    console.log(name + ':', kept);
    await sleep(7000);
  }
  console.log('Run finished. Calls used:', calls, '| total stored:', hist.results.length);
})().catch((e) => console.log('FAILED:', e.message));
