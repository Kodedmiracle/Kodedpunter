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
  "clippers": "los angeles clippers",
  "la lakers": "los angeles lakers",
  "lakers": "los angeles lakers",
  "ny knicks": "new york knicks",
  "knicks": "new york knicks",
  "gs warriors": "golden state warriors",
  "warriors": "golden state warriors",
  "sa spurs": "san antonio spurs",
  "spurs": "san antonio spurs",
  "no pelicans": "new orleans pelicans",
  "pelicans": "new orleans pelicans",
  "phx suns": "phoenix suns",
  "suns": "phoenix suns",
  "trail blazers": "portland trail blazers",
  "blazers": "portland trail blazers",
  "sixers": "philadelphia 76ers",
  "76ers": "philadelphia 76ers",
  "st johns red storm": "st johns red storm",
  "st john s red storm": "st johns red storm",
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
  // mascot / last word (Knicks, Lakers, Wildcats)
  if (ta[ta.length - 1] === tb[tb.length - 1]) return true;
  // shared distinctive token
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

/** Map our lean onto SportyBet outcome, accounting for home/away flip */
export function resolveNbaMoneyline(pick, ev) {
  const direct =
    teamMatch(pick.homeTeam, ev.home) && teamMatch(pick.awayTeam, ev.away);
  const flipped =
    teamMatch(pick.homeTeam, ev.away) && teamMatch(pick.awayTeam, ev.home);
  if (!direct && !flipped) return null;

  const wantHome = pick.leanKey === "Home Win" || pick.leanKey === "Home";
  // SportyBet 219: 4 = Home, 5 = Away (their home)
  if (direct) {
    return { marketId: "219", outcomeId: wantHome ? "4" : "5" };
  }
  // our home is their away
  return { marketId: "219", outcomeId: wantHome ? "5" : "4" };
}

export function nbaLeanToSporty(leanKey) {
  if (leanKey === "Home Win" || leanKey === "Home") {
    return { marketId: "219", outcomeId: "4" };
  }
  if (leanKey === "Away Win" || leanKey === "Away") {
    return { marketId: "219", outcomeId: "5" };
  }
  return null;
}

export function moneylineOdds(ev, pick) {
  const lean = resolveNbaMoneyline(pick, ev);
  if (!lean || !ev.odds) return null;
  return ev.odds[lean.marketId + "||" + lean.outcomeId] || null;
}
