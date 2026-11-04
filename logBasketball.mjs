import 'dotenv/config';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const read = (f) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; }
};
const games = [...read('public/nba-predictions.json'), ...read('public/ncaa-predictions.json')];
const now = Date.now();

const rows = [];
for (const g of games) {
  if (new Date(g.kickoff).getTime() <= now) continue;
  const ml = g.prediction && g.prediction.moneyline;
  if (!ml) continue;
  const homeFav = ml.home.probability >= ml.away.probability;
  const side = homeFav ? ml.home : ml.away;
  if (side.confidence !== 'HIGH' && side.confidence !== 'MEDIUM') continue;
  rows.push({
    match_id: 'bb-' + g.matchId,
    home_team: g.homeTeam,
    away_team: g.awayTeam,
    competition: g.competition || 'NBA',
    kickoff: g.kickoff,
    market: homeFav ? 'home_win' : 'away_win',
    probability: side.probability,
    confidence: side.confidence,
  });
}

const supabase = createClient(url, key);
const ids = [...new Set(rows.map((r) => r.match_id))];
let fresh = rows;
if (ids.length) {
  const { data: have, error: e1 } = await supabase.from('pick_log').select('match_id').in('match_id', ids);
  if (e1) {
    console.error('Read failed:', e1.message);
    process.exit(1);
  }
  const seen = new Set((have || []).map((h) => h.match_id));
  fresh = rows.filter((r) => !seen.has(r.match_id));
}
if (fresh.length) {
  const { error } = await supabase.from('pick_log').insert(fresh);
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
}
console.log(`Basketball picks: ${rows.length} | already logged: ${rows.length - fresh.length} | newly logged: ${fresh.length}`);
