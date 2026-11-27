// Positive handicaps from the Dixon-Coles score grid.
//
// European +N (3-way) for a side covers when that side is strictly ahead
// after receiving N goals. The handicap draw (they lose by exactly N) is a
// separate losing result, not a cover.
//
// Asian +(N-0.5) wins on the same scores, with no push.
// Asian +N wins on the same scores too, but a loss by exactly N is a push
// (stake returned), not a win. That push is reported separately and is not
// added to the cover probability.

const LINES = [1, 2, 3, 4, 5];

function matrixUnit(matrix) {
  let sum = 0;
  for (const row of matrix || []) {
    for (const p of row) sum += p;
  }
  if (sum > 2) return 1 / 100;
  return 1;
}

function sumWhere(matrix, test) {
  if (!matrix || !matrix.length) return 0;
  const unit = matrixUnit(matrix);
  let total = 0;
  for (let h = 0; h < matrix.length; h++) {
    const row = matrix[h];
    for (let a = 0; a < row.length; a++) {
      if (test(h, a)) total += row[a] * unit;
    }
  }
  return total;
}

function coversEuropean(goalsFor, goalsAgainst, line) {
  return goalsFor + line > goalsAgainst;
}

function europeanCoverProbability(matrix, side, line) {
  if (side === "home") return sumWhere(matrix, (h, a) => h + line > a);
  if (side === "away") return sumWhere(matrix, (h, a) => a + line > h);
  return 0;
}

function asianIntegerSplit(matrix, side, line) {
  const win = europeanCoverProbability(matrix, side, line);
  const push =
    side === "home"
      ? sumWhere(matrix, (h, a) => h + line === a)
      : sumWhere(matrix, (h, a) => a + line === h);
  const lose = Math.max(0, 1 - win - push);
  return { win, push, lose };
}

function roundPct(p) {
  return Math.round(p * 1000) / 10;
}

function choosePositiveHandicap(matrix, side, targetPercent = 80) {
  const target = Number(targetPercent) / 100;
  if (!matrix || !Number.isFinite(target)) return null;
  for (const line of LINES) {
    const probability = europeanCoverProbability(matrix, side, line);
    if (probability + 1e-12 >= target) {
      const asian = asianIntegerSplit(matrix, side, line);
      return {
        side,
        line,
        probability: roundPct(probability),
        asianHalf: line - 0.5,
        asianPush: roundPct(asian.push),
      };
    }
  }
  return null;
}

function europeanSpecifier(side, line) {
  return side === "home" ? "hcp=" + line + ":0" : "hcp=0:" + line;
}

function europeanOutcomeId(side) {
  return side === "home" ? "1711" : "1713";
}

function asianHalfSpecifier(side, europeanLine) {
  const half = europeanLine - 0.5;
  return side === "home" ? "hcp=" + half : "hcp=-" + half;
}

function asianHalfOutcomeId(side) {
  return side === "home" ? "1714" : "1715";
}

function readPrice(event, marketId, specifier, outcomeId) {
  if (!event || !event.odds) return null;
  const value = Number(event.odds[marketId + "|" + specifier + "|" + outcomeId]);
  return value > 1 ? value : null;
}

function proportionalImplied(oddsList) {
  const raw = oddsList.map((o) => 1 / o);
  const sum = raw.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return null;
  return raw.map((q) => q / sum);
}

function europeanQuote(event, side, line) {
  const specifier = europeanSpecifier(side, line);
  const home = readPrice(event, "14", specifier, "1711");
  const draw = readPrice(event, "14", specifier, "1712");
  const away = readPrice(event, "14", specifier, "1713");
  if (!(home && draw && away)) return null;
  const implied = proportionalImplied([home, draw, away]);
  const index = side === "home" ? 0 : 2;
  return {
    marketId: "14",
    outcomeId: europeanOutcomeId(side),
    specifier,
    odds: side === "home" ? home : away,
    implied: roundPct(implied[index]),
  };
}

function asianHalfQuote(event, side, europeanLine) {
  const specifier = asianHalfSpecifier(side, europeanLine);
  const home = readPrice(event, "16", specifier, "1714");
  const away = readPrice(event, "16", specifier, "1715");
  if (!(home && away)) return null;
  const implied = proportionalImplied([home, away]);
  const index = side === "home" ? 0 : 1;
  return {
    marketId: "16",
    outcomeId: asianHalfOutcomeId(side),
    specifier,
    odds: side === "home" ? home : away,
    implied: roundPct(implied[index]),
    line: europeanLine - 0.5,
  };
}

function feedHasHandicapPrices(events) {
  return (events || []).some((event) =>
    Object.keys(event.odds || {}).some((key) => key.startsWith("14|") || key.startsWith("16|"))
  );
}

module.exports = {
  LINES,
  coversEuropean,
  europeanCoverProbability,
  asianIntegerSplit,
  choosePositiveHandicap,
  europeanSpecifier,
  europeanOutcomeId,
  asianHalfSpecifier,
  europeanQuote,
  asianHalfQuote,
  feedHasHandicapPrices,
};
