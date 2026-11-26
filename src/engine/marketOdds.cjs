// De-vig bookmaker prices and blend them with model probabilities.
// Historical files have no odds, so the backtest does not include this step.

function confidenceLabel(probabilityPercent) {
  if (probabilityPercent >= 80) return "VERY HIGH";
  if (probabilityPercent >= 65) return "HIGH";
  if (probabilityPercent >= 50) return "MEDIUM";
  if (probabilityPercent >= 35) return "LOW";
  return "VERY LOW";
}

function demargin1x2(odds) {
  const home = 1 / odds.home;
  const draw = 1 / odds.draw;
  const away = 1 / odds.away;
  const sum = home + draw + away;
  if (!Number.isFinite(sum) || sum <= 0) return null;
  return { home: home / sum, draw: draw / sum, away: away / sum, overround: sum };
}

function blend1x2(model, market, marketWeight) {
  const w = Math.min(1, Math.max(0, marketWeight));
  const mixed = {
    home: (1 - w) * model.home + w * market.home,
    draw: (1 - w) * model.draw + w * market.draw,
    away: (1 - w) * model.away + w * market.away,
  };
  const sum = mixed.home + mixed.draw + mixed.away;
  return {
    home: mixed.home / sum,
    draw: mixed.draw / sum,
    away: mixed.away / sum,
  };
}

// Flag the outcome where the pure model is meaningfully above the de-vigged price.
// `edge` is in percentage points.
function valueFlag(model, market, minEdge = 0.04) {
  const sides = [
    ["Home Win", model.home, market.home],
    ["Draw", model.draw, market.draw],
    ["Away Win", model.away, market.away],
  ];
  sides.sort((a, b) => b[1] - b[2] - (a[1] - a[2]));
  const [selection, modelP, marketP] = sides[0];
  const edge = modelP - marketP;
  if (edge < minEdge || modelP < 0.35) return null;
  return {
    selection,
    edge: Math.round(edge * 1000) / 10,
    model: Math.round(modelP * 1000) / 10,
    market: Math.round(marketP * 1000) / 10,
  };
}

module.exports = {
  confidenceLabel,
  demargin1x2,
  blend1x2,
  valueFlag,
};
