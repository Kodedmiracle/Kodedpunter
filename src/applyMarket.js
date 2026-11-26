import { sameMatch } from "./sportyNames.js";
import {
  blend1x2,
  confidenceLabel,
  demargin1x2,
  valueFlag,
} from "./engine/marketOdds.cjs";

export const MARKET_WEIGHT = 0.5;

export function oddsFor1x2(event) {
  const odds = event && event.odds;
  if (!odds) return null;
  const home = Number(odds["1||1"]);
  const draw = Number(odds["1||2"]);
  const away = Number(odds["1||3"]);
  if (!(home > 1 && draw > 1 && away > 1)) return null;
  return { home, draw, away };
}

function pct(x) {
  return Math.round(x * 1000) / 10;
}

function side(probability) {
  return { probability: pct(probability), confidence: confidenceLabel(pct(probability)) };
}

export function applyMarketToMatch(match, events) {
  const result = match && match.prediction && match.prediction.matchResult;
  if (!result || !result.homeWin || !events || !events.length) return match;

  const event = events.find((e) =>
    sameMatch(match.homeTeam, match.awayTeam, e.home, e.away)
  );
  const quoted = oddsFor1x2(event);
  if (!quoted) return match;

  const model = {
    home: result.homeWin.probability / 100,
    draw: result.draw.probability / 100,
    away: result.awayWin.probability / 100,
  };
  const market = demargin1x2(quoted);
  if (!market) return match;
  const blended = blend1x2(model, market, MARKET_WEIGHT);

  return {
    ...match,
    prediction: {
      ...match.prediction,
      modelResult: result,
      matchResult: {
        homeWin: side(blended.home),
        draw: side(blended.draw),
        awayWin: side(blended.away),
      },
      doubleChance: {
        homeOrDraw: side(blended.home + blended.draw),
        homeOrAway: side(blended.home + blended.away),
        drawOrAway: side(blended.draw + blended.away),
      },
      market: {
        home: pct(market.home),
        draw: pct(market.draw),
        away: pct(market.away),
        source: "SportyBet",
      },
      value: valueFlag(model, market),
    },
  };
}

export function applyMarketToMatches(matches, events) {
  if (!events || !events.length) return matches;
  return matches.map((m) => applyMarketToMatch(m, events));
}
