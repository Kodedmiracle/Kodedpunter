const fs = require('fs');
const { predictFromXG } = require('./src/engine/poissonModel.cjs');

// Data-quality rules (tune these here)
const MIN_GAMES = 10;   // both teams need this many games, or confidence is capped at LOW
const MIN_RECENT = 5;   // both teams need this many games in the last 45 days, or capped at MEDIUM

// Leagues already covered by the football-data.org model (API-Football league ids)
const MAIN_LEAGUES = new Set([39, 140, 135, 78, 61, 2, 40, 88, 94, 71]);

const RANK = { 'VERY LOW': 1, 'LOW': 2, 'MEDIUM': 3, 'HIGH': 4, 'VERY HIGH': 5 };

function capConfidence(prediction, max) {
  const limit = RANK[max];
  ['matchResult', 'doubleChance', 'btts', 'overUnder'].forEach((group) => {
    Object.values(prediction[group]).forEach((m) => {
      if (RANK[m.confidence] > limit) m.confidence = max;
    });
  });
}

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const upcoming = read('data/upcoming.json');
const xg = new Map(read('data/expected.json').map((e) => [e.id, e]));

const out = [];
const tiers = { FULL: 0, MEDIUM: 0, LOW: 0 };
const mainSkipped = new Set();
let mainCount = 0;
let noData = 0;

upcoming.forEach((u) => {
  if (MAIN_LEAGUES.has(u.league)) {
    mainCount++;
    mainSkipped.add(u.country + ' - ' + u.leagueName);
    return;
  }
  const e = xg.get(u.id);
  if (!e || Math.min(e.gamesHome, e.gamesAway) < 1) {
    noData++;
    return;
  }

  const prediction = predictFromXG(e.xgHome, e.xgAway);
  let cap = null;
  if (Math.min(e.gamesHome, e.gamesAway) < MIN_GAMES) cap = 'LOW';
  else if (Math.min(e.recentHome, e.recentAway) < MIN_RECENT) cap = 'MEDIUM';
  if (cap) capConfidence(prediction, cap);
  tiers[cap || 'FULL']++;

  out.push({
    competition: u.country + ' - ' + u.leagueName,
    matchId: 'af-' + u.id,
    homeTeam: u.homeName,
    awayTeam: u.awayName,
    homeCrest: u.homeLogo,
    awayCrest: u.awayLogo,
    kickoff: new Date(u.kickoff).toISOString(),
    source: 'api-football',
    dataQuality: cap || 'FULL',
    prediction,
  });
});

out.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
fs.writeFileSync('public/extra-predictions.json', JSON.stringify(out));

console.log('Extra predictions written:', out.length);
console.log('  full confidence:', tiers.FULL, '| capped MEDIUM:', tiers.MEDIUM, '| capped LOW:', tiers.LOW);
console.log('Skipped, covered by main model:', mainCount);
console.log('  leagues:', [...mainSkipped].join('; '));
console.log('Skipped, no data:', noData);
