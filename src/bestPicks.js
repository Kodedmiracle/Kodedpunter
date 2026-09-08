// bestPicks.js
// Scans all matches and extracts the highest-confidence predictions
// across every market into a single ranked list.

const MARKET_LABELS = {
  "matchResult.homeWin": "🏠 Home Win",
  "matchResult.draw": "🤝 Draw",
  "matchResult.awayWin": "✈️ Away Win",
  "btts.yes": "⚽ BTTS Yes",
  "btts.no": "🚫 BTTS No",
  "overUnder.over15": "📈 Over 1.5",
  "overUnder.over25": "📈 Over 2.5",
  "overUnder.over35": "📈 Over 3.5",
  "overUnder.under15": "📉 Under 1.5",
  "overUnder.under25": "📉 Under 2.5",
  "overUnder.under35": "📉 Under 3.5",
};

function getNested(obj, path) {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}

export function extractBestPicks(matches, limit = 10) {
  const allPicks = [];

  matches.forEach((match) => {
    Object.entries(MARKET_LABELS).forEach(([path, label]) => {
      const marketData = getNested(match.prediction, path);
      if (!marketData) return;

      allPicks.push({
        matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
        competition: match.competition,
        market: label,
        probability: marketData.probability,
        confidence: marketData.confidence,
      });
    });
  });

  allPicks.sort((a, b) => b.probability - a.probability);

  return allPicks.slice(0, limit);
}
