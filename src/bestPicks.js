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

const INCLUDE_CL_IN_BEST_PICKS = false;

function isProvisional(match) {
  return match.competition === "Champions League";
}

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
  const realMatches = matches.filter((m) => {
    if (placeholders.has(m)) return false;
    if (!INCLUDE_CL_IN_BEST_PICKS && isProvisional(m)) return false;
    return true;
  });

  const leans = realMatches.map((m) => {
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
  });

  leans.sort((a, b) => b.score - a.score);

  return leans.slice(0, limit);
}

export function getRecommendedMarket(match, allMatches) {
  const placeholders = findPlaceholderMatches(allMatches);
  if (placeholders.has(match)) return null;
  if (!INCLUDE_CL_IN_BEST_PICKS && isProvisional(match)) return null;
  return bestMarketForMatch(match.prediction);
}
