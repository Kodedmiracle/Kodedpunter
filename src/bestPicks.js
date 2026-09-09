// bestPicks.js
// Picks the single most useful market per match (not just "highest raw
// probability"), then ranks those across all matches. Markets like Over 1.5
// are usually high by nature and get down-weighted so they don't dominate
// every slot. Matches with no real season data yet (all teams look
// identical) are detected automatically and excluded, rather than
// hardcoding a competition name that would go stale once real data exists.

const USEFULNESS = {
  homeWin: 1.0,
  draw: 1.0,
  awayWin: 1.0,
  bttsYes: 0.9,
  bttsNo: 0.9,
  over25: 0.85,
  under35: 0.7,
  homeOrDraw: 0.55,
  drawOrAway: 0.55,
  homeOrAway: 0.4,
  over15: 0.35,
  under15: 0.35,
  over35: 0.6,
  under25: 0.6,
};

function buildCandidates(prediction) {
  const { matchResult, doubleChance, btts, overUnder } = prediction;
  return [
    { key: "Home Win", icon: "🏠", data: matchResult.homeWin, weight: USEFULNESS.homeWin },
    { key: "Draw", icon: "🤝", data: matchResult.draw, weight: USEFULNESS.draw },
    { key: "Away Win", icon: "✈️", data: matchResult.awayWin, weight: USEFULNESS.awayWin },
    { key: "BTTS Yes", icon: "⚽", data: btts.yes, weight: USEFULNESS.bttsYes },
    { key: "BTTS No", icon: "🚫", data: btts.no, weight: USEFULNESS.bttsNo },
    { key: "Over 2.5", icon: "📈", data: overUnder.over25, weight: USEFULNESS.over25 },
    { key: "Under 3.5", icon: "📉", data: overUnder.under35, weight: USEFULNESS.under35 },
    { key: "Home or Draw", icon: "🎯", data: doubleChance.homeOrDraw, weight: USEFULNESS.homeOrDraw },
    { key: "Draw or Away", icon: "🎯", data: doubleChance.drawOrAway, weight: USEFULNESS.drawOrAway },
    { key: "Over 1.5", icon: "📈", data: overUnder.over15, weight: USEFULNESS.over15 },
  ];
}

/**
 * The single most useful market for one match: probability weighted by
 * how informative that market typically is, not just raw size.
 */
function bestMarketForMatch(prediction) {
  const candidates = buildCandidates(prediction);
  return candidates
    .map((c) => ({ ...c, score: (c.data.probability / 100) * c.weight }))
    .sort((a, b) => b.score - a.score)[0];
}

/**
 * Detects matches with no real season data yet: every team in a competition
 * defaults to "exactly average," so those matches end up with identical
 * match-result probabilities across the whole competition. Flag any
 * competition where 2+ matches share the exact same signature — this
 * self-corrects once real data exists, instead of hardcoding a league name.
 */
function findPlaceholderMatches(matches) {
  const bySignature = new Map();

  matches.forEach((m) => {
    const r = m.prediction.matchResult;
    const sig = `${m.competition}|${r.homeWin.probability}|${r.draw.probability}|${r.awayWin.probability}`;
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig).push(m);
  });

  const placeholders = new Set();
  bySignature.forEach((group) => {
    if (group.length >= 2) {
      group.forEach((m) => placeholders.add(m));
    }
  });

  return placeholders;
}

export function extractBestPicks(matches, limit = 10) {
  if (!matches || matches.length === 0) return [];

  const placeholders = findPlaceholderMatches(matches);
  const realMatches = matches.filter((m) => !placeholders.has(m));

  const leans = realMatches.map((m) => {
    const lean = bestMarketForMatch(m.prediction);
    return {
      matchLabel: `${m.homeTeam} vs ${m.awayTeam}`,
      competition: m.competition,
      market: `${lean.icon} ${lean.key}`,
      probability: lean.data.probability,
      confidence: lean.data.confidence,
      score: lean.score,
    };
  });

  leans.sort((a, b) => b.score - a.score);

  return leans.slice(0, limit);
}

// Exposed for reuse elsewhere (e.g. showing the "recommended market" on
// each match card without duplicating this logic).
export function getRecommendedMarket(match, allMatches) {
  const placeholders = findPlaceholderMatches(allMatches);
  if (placeholders.has(match)) return null;
  return bestMarketForMatch(match.prediction);
}
