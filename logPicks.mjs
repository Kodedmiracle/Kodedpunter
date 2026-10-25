import 'dotenv/config';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { extractBestPicks } from './src/bestPicks.js';

const KEYS = {
  'Home Win': 'home_win', 'Draw': 'draw', 'Away Win': 'away_win',
  'BTTS Yes': 'btts_yes', 'BTTS No': 'btts_no',
  'Over 1.5': 'over_1_5', 'Over 2.5': 'over_2_5', 'Under 3.5': 'under_3_5',
  'Home or Draw': 'home_or_draw', 'Draw or Away': 'draw_or_away',
};

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase env vars missing');
  process.exit(1);
}

const all = JSON.parse(fs.readFileSync('public/predictions.json', 'utf8'));
const now = Date.now();
const upcoming = all.filter(
  (m) => /^\d+$/.test(String(m.matchId)) && new Date(m.kickoff).getTime() > now
);

const picks = extractBestPicks(upcoming, 1000);
const rows = [];
for (const p of picks) {
  const m = upcoming.find(
    (x) => x.homeTeam === p.homeTeam && x.awayTeam === p.awayTeam && x.competition === p.competition
  );
  const market = KEYS[p.leanKey];
  if (!m || !market) continue;
  rows.push({
    match_id: String(m.matchId),
    home_team: m.homeTeam,
    away_team: m.awayTeam,
    competition: m.competition,
    kickoff: m.kickoff,
    market,
    probability: p.probability,
    confidence: p.confidence,
  });
}

const supabase = createClient(url, key);
const ids = [...new Set(rows.map((r) => r.match_id))];
const { data: have, error: e1 } = await supabase.from('pick_log').select('match_id').in('match_id', ids);
if (e1) {
  console.error('Read failed:', e1.message);
  process.exit(1);
}
const seen = new Set((have || []).map((h) => h.match_id));
const fresh = rows.filter((r) => !seen.has(r.match_id));

if (fresh.length) {
  const { error } = await supabase.from('pick_log').insert(fresh);
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
}
console.log(`Best Picks found: ${rows.length} | already logged: ${rows.length - fresh.length} | newly logged: ${fresh.length}`);
