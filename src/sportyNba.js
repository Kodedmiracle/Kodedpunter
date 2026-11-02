// SportyBet NBA helpers

export function normalizeNba(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|basketball|club|bc|team)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES = {
  "la clippers": "los angeles clippers",
  "la lakers": "los angeles lakers",
  "l a clippers": "los angeles clippers",
  "l a lakers": "los angeles lakers",
  "ny knicks": "new york knicks",
  "gs warriors": "golden state warriors",
  "sa spurs": "san antonio spurs",
  "no pelicans": "new orleans pelicans",
  "phx suns": "phoenix suns",
  "utah jazz": "utah jazz",
  "trail blazers": "portland trail blazers",
  "blazers": "portland trail blazers",
};

export function canonNba(name) {
  let n = normalizeNba(name);
  if (ALIASES[n]) n = ALIASES[n];
  // drop city-only short forms handled above
  return n;
}

export function sameNbaMatch(ourHome, ourAway, sbHome, sbAway) {
  const oh = canonNba(ourHome);
  const oa = canonNba(ourAway);
  const sh = canonNba(sbHome);
  const sa = canonNba(sbAway);
  if (!oh || !oa || !sh || !sa) return false;
  const direct =
    (oh === sh || oh.includes(sh) || sh.includes(oh)) &&
    (oa === sa || oa.includes(sa) || sa.includes(oa));
  const flipped =
    (oh === sa || oh.includes(sa) || sa.includes(oh)) &&
    (oa === sh || oa.includes(sh) || sh.includes(oa));
  return direct || flipped;
}

// Moneyline only for v1
export function nbaLeanToSporty(leanKey) {
  if (leanKey === "Home Win" || leanKey === "Home") {
    return { marketId: "219", outcomeId: "4" };
  }
  if (leanKey === "Away Win" || leanKey === "Away") {
    return { marketId: "219", outcomeId: "5" };
  }
  return null;
}
