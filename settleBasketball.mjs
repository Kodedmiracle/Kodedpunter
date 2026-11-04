import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HL = process.env.HIGHLIGHTLY_API_KEY;
if (!url || !key || !HL) {
  console.error('Missing env vars (Supabase or HIGHLIGHTLY_API_KEY)');
  process.exit(1);
}
const MAX_MATCHES = 25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sum = (a) => (Array.isArray(a) ? a.reduce((x, y) => x + (Number(y) || 0), 0) : 0);

const supabase = createClient(url, key);
const cutoff = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
const { data: rows, error } = await supabase
  .from('pick_log')
  .select('*')
  .like('match_id', 'bb-%')
  .is('correct', null)
  .lt('kickoff', cutoff);
if (error) {
  console.error('Read failed:', error.message);
  process.exit(1);
}

const byMatch = {};
for (const r of rows || []) (byMatch[r.match_id] = byMatch[r.match_id] || []).push(r);
const ids = Object.keys(byMatch).slice(0, MAX_MATCHES);
console.log(`Basketball picks awaiting result: ${rows.length} across ${Object.keys(byMatch).length} games (checking ${ids.length})`);

let graded = 0, notFinal = 0, failed = 0;
for (const mid of ids) {
  let res;
  try {
    res = await fetch('https://nba.highlightly.net/matches/' + mid.replace('bb-', ''), {
      headers: { 'x-rapidapi-key': HL },
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    console.log('fetch failed', mid, e.message);
    failed++;
    await sleep(13000);
    continue;
  }
  if (res.status === 429) {
    console.log('Rate limit hit, stopping');
    break;
  }
  if (!res.ok) {
    console.log('HTTP', res.status, mid);
    failed++;
    await sleep(13000);
    continue;
  }
  const body = await res.json();
  const m = Array.isArray(body) ? body[0] : body;
  const st = m && m.state;
  if (!st || st.description !== 'Finished') {
    notFinal++;
    await sleep(13000);
    continue;
  }
  const h = sum(st.score && st.score.homeTeam);
  const a = sum(st.score && st.score.awayTeam);
  if (h === a) {
    console.log('Tie/odd score, skipping', mid, h, a);
    await sleep(13000);
    continue;
  }
  const homeWon = h > a;
  for (const r of byMatch[mid]) {
    const correct = (r.market === 'home_win') === homeWon;
    const { error: ue } = await supabase
      .from('pick_log')
      .update({ correct, actual_result: h + '-' + a })
      .eq('id', r.id);
    if (ue) console.log('update failed', mid, ue.message);
    else graded++;
  }
  await sleep(13000);
}
console.log(`Graded: ${graded} | not finished yet: ${notFinal} | failed: ${failed}`);
