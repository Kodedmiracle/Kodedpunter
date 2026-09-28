const fs = require('fs');

const HALF_LIFE_DAYS = 365;
const K = 4;
const PRIOR_GOALS = 1.35;
const FALLBACK_HOME = 1.5;
const FALLBACK_AWAY = 1.2;

const read = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const hist = read('data/history.json', { results: [] }).results;
const recent = read('data/results.json', []);
const upcoming = read('data/upcoming.json', []);

const now = Date.now();
const all = [...hist, ...recent]
  .filter((r) => r.gh != null && r.ga != null)
  .map((r) => {
    const age = Math.max(0, (now - new Date(r.d).getTime()) / 86400000);
    return { ...r, age, w: Math.pow(0.5, age / HALF_LIFE_DAYS) };
  });

const lg = {};
let gH = 0, gA = 0, gW = 0;
all.forEach((r) => {
  const L = lg[r.lg] || (lg[r.lg] = { h: 0, a: 0, w: 0, n: 0 });
  L.h += r.w * r.gh; L.a += r.w * r.ga; L.w += r.w; L.n++;
  gH += r.w * r.gh; gA += r.w * r.ga; gW += r.w;
});
const globalHome = gW ? gH / gW : FALLBACK_HOME;
const globalAway = gW ? gA / gW : FALLBACK_AWAY;
const avg = (id) => {
  const L = lg[id];
  if (!L || L.n < 30) return { home: globalHome, away: globalAway };
  return { home: L.h / L.w, away: L.a / L.w };
};

const tm = {};
const T = (id) => tm[id] || (tm[id] = { sf: 0, bf: 0, sa: 0, ba: 0, n: 0, recent: 0 });
all.forEach((r) => {
  const a = avg(r.lg);
  const H = T(r.h), A = T(r.a);
  H.sf += r.w * r.gh; H.bf += r.w * a.home; H.sa += r.w * r.ga; H.ba += r.w * a.away; H.n++;
  A.sf += r.w * r.ga; A.bf += r.w * a.away; A.sa += r.w * r.gh; A.ba += r.w * a.home; A.n++;
  if (r.age <= 45) { H.recent++; A.recent++; }
});

const rating = (id) => {
  const t = tm[id];
  if (!t) return { atk: 1, def: 1, n: 0, recent: 0 };
  return {
    atk: (t.sf + K * PRIOR_GOALS) / (t.bf + K * PRIOR_GOALS),
    def: (t.sa + K * PRIOR_GOALS) / (t.ba + K * PRIOR_GOALS),
    n: t.n,
    recent: t.recent,
  };
};

const clamp = (x) => Math.min(4.5, Math.max(0.2, x));
const expected = upcoming.map((u) => {
  const a = avg(u.league);
  const h = rating(u.home), w = rating(u.away);
  return {
    id: u.id, league: u.league, home: u.home, away: u.away,
    xgHome: +clamp(a.home * h.atk * w.def).toFixed(2),
    xgAway: +clamp(a.away * w.atk * h.def).toFixed(2),
    gamesHome: h.n, gamesAway: w.n, recentHome: h.recent, recentAway: w.recent,
  };
});

const teams = {};
Object.keys(tm).forEach((id) => { const r = rating(id); teams[id] = { atk: +r.atk.toFixed(3), def: +r.def.toFixed(3), n: r.n, recent: r.recent }; });
fs.writeFileSync('data/ratings.json', JSON.stringify(teams));
fs.writeFileSync('data/expected.json', JSON.stringify(expected));

const both = (e, min) => e.gamesHome >= min && e.gamesAway >= min;
console.log('Results used:', all.length, '| teams rated:', Object.keys(tm).length);
console.log('Upcoming fixtures:', expected.length);
console.log('  no data for one or both teams:', expected.filter((e) => !both(e, 1)).length);
console.log('  thin (under 10 games):', expected.filter((e) => both(e, 1) && !both(e, 10)).length);
console.log('  good (10+ games each):', expected.filter((e) => both(e, 10)).length);

const names = {};
upcoming.forEach((u) => { names[u.id] = u.homeName + ' vs ' + u.awayName; });
console.log('\nSamples:');
expected.filter((e) => both(e, 20)).slice(0, 8).forEach((e) =>
  console.log(names[e.id], '| xG', e.xgHome, '-', e.xgAway, '| games', e.gamesHome + '/' + e.gamesAway)
);
