export function normalizeNba(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(
      /\b(the|basketball|club|bc|team|university|univ|state)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES = {
  "la clippers": "los angeles clippers",
  clippers: "los angeles clippers",
  "la lakers": "los angeles lakers",
  lakers: "los angeles lakers",
  "ny knicks": "new york knicks",
  knicks: "new york knicks",
  "gs warriors": "golden state warriors",
  warriors: "golden state warriors",
  "sa spurs": "san antonio spurs",
  spurs: "san antonio spurs",
  "no pelicans": "new orleans pelicans",
  pelicans: "new orleans pelicans",
  "phx suns": "phoenix suns",
  suns: "phoenix suns",
  "trail blazers": "portland trail blazers",
  blazers: "portland trail blazers",
  sixers: "philadelphia 76ers",
  "76ers": "philadelphia 76ers",
  "st johns red storm": "st johns red storm",
};

export function canonNba(name) {
  let n = normalizeNba(name);
  if (ALIASES[n]) n = ALIASES[n];
  return n;
}

function tokens(name) {
  return canonNba(name)
    .split(" ")
    .filter((w) => w.length > 2);
}

export function teamMatch(a, b) {
  const ca = canonNba(a);
  const cb = canonNba(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta[ta.length - 1] === tb[tb.length - 1]) return true;
  const setB = new Set(tb);
  let shared = 0;
  for (const t of ta) if (setB.has(t)) shared++;
  return shared >= 2 || (shared === 1 && (ta.length <= 2 || tb.length <= 2));
}

export function sameNbaMatch(ourHome, ourAway, sbHome, sbAway) {
  const direct = teamMatch(ourHome, sbHome) && teamMatch(ourAway, sbAway);
  const flipped = teamMatch(ourHome, sbAway) && teamMatch(ourAway, sbHome);
  return direct || flipped;
}

export function resolveNbaMoneyline(pick, ev) {
  const direct =
    teamMatch(pick.homeTeam, ev.home) && teamMatch(pick.awayTeam, ev.away);
  const flipped =
    teamMatch(pick.homeTeam, ev.away) && teamMatch(pick.awayTeam, ev.home);
  if (!direct && !flipped) return null;
  const wantHome = pick.leanKey.indexOf("Home") === 0;
  if (direct) {
    return { marketId: "219", outcomeId: wantHome ? "4" : "5" };
  }
  return { marketId: "219", outcomeId: wantHome ? "5" : "4" };
}

/** Collect total= lines for a market id from odds map */
function linesForMarket(ev, marketId) {
  const found = new Map();
  for (const key of Object.keys(ev.odds || {})) {
    const parts = key.split("|");
    if (parts[0] !== marketId) continue;
    const m = /^total=([\d.]+)$/.exec(parts[1] || "");
    if (!m) continue;
    const line = parseFloat(m[1]);
    if (!found.has(line)) found.set(line, true);
  }
  return Array.from(found.keys()).sort((a, b) => a - b);
}

/**
 * Closest total line to projected points.
 * marketId: 225 full, 68 1H, 228 2H (SportyBet)
 * side: "Over" | "Under"
 */
export function resolveNbaTotal(ev, projected, marketId, preferSide) {
  const lines = linesForMarket(ev, marketId);
  if (!lines.length || !Number.isFinite(projected)) return null;

  let best = lines[0];
  let bestDist = Math.abs(lines[0] - projected);
  for (const line of lines) {
    const d = Math.abs(line - projected);
    if (d < bestDist) {
      best = line;
      bestDist = d;
    }
  }

  let side = preferSide;
  if (!side) side = projected >= best ? "Over" : "Under";

  return {
    marketId: String(marketId),
    specifier: "total=" + best,
    outcomeId: side === "Over" ? "12" : "13",
    line: best,
    side,
  };
}

export function moneylineOdds(ev, pick) {
  const lean = resolveNbaMoneyline(pick, ev);
  if (!lean || !ev.odds) return null;
  return ev.odds[lean.marketId + "||" + lean.outcomeId] || null;
}

export function totalOdds(ev, resolved) {
  if (!resolved || !ev.odds) return null;
  const key =
    resolved.marketId + "|" + resolved.specifier + "|" + resolved.outcomeId;
  return ev.odds[key] || null;
}

/** Turn a pick + event into SportyBet outcome object */
export function resolvePickToOutcome(pick, ev) {
  const mt = pick.marketType || "moneyline";
  if (mt === "moneyline") {
    const lean = resolveNbaMoneyline(pick, ev);
    if (!lean) return null;
    return {
      eventId: ev.eventId,
      marketId: lean.marketId,
      outcomeId: lean.outcomeId,
    };
  }
  // totals
  const marketId =
    mt === "total" ? "225" : mt === "1h_total" ? "68" : mt === "2h_total" ? "228" : null;
  if (!marketId) return null;
  const projected =
    mt === "total"
      ? pick.projected
      : mt === "1h_total"
        ? pick.projected1h
        : pick.projected2h;
  const side = pick.totalSide; // "Over" | "Under"
  const resolved = resolveNbaTotal(ev, projected, marketId, side);
  if (!resolved) return null;
  return {
    eventId: ev.eventId,
    marketId: resolved.marketId,
    outcomeId: resolved.outcomeId,
    specifier: resolved.specifier,
  };
}
