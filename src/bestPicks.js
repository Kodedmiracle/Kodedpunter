const USEFULNESS = {
  homeWin: 1.0,
  draw: 1.0,
  awayWin: 1.0,
  bttsYes: 1.0,
  bttsNo: 1.0,
  over25: 1.0,
  under35: 1.0,
  homeOrDraw: 1.0,
  drawOrAway: 1.0,
  homeOrAway: 1.0,
  over15: 1.0,
  under15: 1.0,
  over05: 1.0,
  over35: 1.0,
  under25: 1.0,
};

const INCLUDE_CL_IN_BEST_PICKS = true;

function isProvisional(match) {
  return match.competition === "Champions League";
}

function buildCandidates(prediction) {
  const { matchResult, doubleChance, btts, overUnder } = prediction;
  const list = [
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
  const over05 = overUnder.over05 || {
    probability: Math.min(99, (overUnder.over15 && overUnder.over15.probability || 70) + 12),
    confidence: "HIGH"
  };
  list.push({ key: "Over 0.5", icon: "📈", data: over05, weight: USEFULNESS.over05 });
  return list;
}

function bestMarketForMatch(prediction) {
  const candidates = buildCandidates(prediction);
  return candidates
    .map((c) => ({ ...c, score: (c.data.probability / 100) * c.weight }))
    .sort((a, b) => b.score - a.score)[0];
}

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

const CONFIDENCE_RANK = { 'VERY HIGH': 5, 'HIGH': 4, 'MEDIUM': 3, 'LOW': 2, 'VERY LOW': 1 };
const MIN_CONFIDENCE = 'HIGH';

export function extractBestPicks(matches, limit = 10) {
  if (!matches || matches.length === 0) return [];

  const placeholders = findPlaceholderMatches(matches);
  const realMatches = matches.filter((m) => {
    if (placeholders.has(m)) return false;
    if (!INCLUDE_CL_IN_BEST_PICKS && isProvisional(m)) return false;
    return true;
  });

  const leans = realMatches
    .map((m) => {
      const lean = bestMarketForMatch(m.prediction);
      return {
        matchLabel: `${m.homeTeam} vs ${m.awayTeam}`,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        leanKey: lean.key,
        competition: m.competition,
        market: `${lean.icon} ${lean.key}`,
        probability: lean.data.probability,
        confidence: lean.data.confidence,
        score: lean.score,
      };
    })
    .filter((l) => CONFIDENCE_RANK[l.confidence] >= CONFIDENCE_RANK[MIN_CONFIDENCE]);

  leans.sort((a, b) => b.score - a.score);

  return leans.slice(0, limit);
}

export function getRecommendedMarket(match, allMatches) {
  const placeholders = findPlaceholderMatches(allMatches);
  if (placeholders.has(match)) return null;
  if (!INCLUDE_CL_IN_BEST_PICKS && isProvisional(match)) return null;
  return bestMarketForMatch(match.prediction);
}
