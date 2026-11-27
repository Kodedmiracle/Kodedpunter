// Calibration of positive-handicap cover probabilities.
// Uses the same walk-forward samples as the 1X2 backtest: each match is
// scored from earlier games only, then the Dixon-Coles grid is asked whether
// each side covers +1, +2, +3, +4 and +5. The headline window is the held-out
// set (matches on or after the 1X2 cutoff).

const fs = require("fs");
const { buildSamples, splitSamples, loadMatches } = require("./backtestFootball.cjs");
const { predictMatch } = require("./src/engine/poissonModel.cjs");
const { europeanCoverProbability, coversEuropean, LINES } = require("./src/engine/handicap.cjs");

function emptyBucket() {
  return { n: 0, predicted: 0, covers: 0, brier: 0 };
}

function add(bucket, probability, covered) {
  const y = covered ? 1 : 0;
  bucket.n += 1;
  bucket.predicted += probability;
  bucket.covers += y;
  const d = probability - y;
  bucket.brier += d * d;
}

function finish(bucket) {
  if (!bucket.n) {
    return { n: 0, meanPredicted: null, actualCoverRate: null, gap: null, brier: null };
  }
  const meanPredicted = bucket.predicted / bucket.n;
  const actualCoverRate = bucket.covers / bucket.n;
  return {
    n: bucket.n,
    meanPredicted: +((meanPredicted * 100).toFixed(2)),
    actualCoverRate: +((actualCoverRate * 100).toFixed(2)),
    gap: +(((actualCoverRate - meanPredicted) * 100).toFixed(2)),
    brier: +(bucket.brier / bucket.n).toFixed(4),
  };
}

function scoreWindow(samples) {
  const byLine = {};
  for (const line of LINES) byLine[String(line)] = emptyBucket();
  const byLineSide = { home: {}, away: {} };
  for (const line of LINES) {
    byLineSide.home[String(line)] = emptyBucket();
    byLineSide.away[String(line)] = emptyBucket();
  }

  for (const sample of samples) {
    const prediction = predictMatch({
      homeTeamStats: sample.homeTeamStats,
      awayTeamStats: sample.awayTeamStats,
      homeRecentMatches: sample.homeRecentMatches,
      awayRecentMatches: sample.awayRecentMatches,
      leagueAvg: sample.leagueAvg,
      asOf: sample.asOf,
    });
    const matrix = prediction.scoreMatrix;
    for (const line of LINES) {
      const homeP = europeanCoverProbability(matrix, "home", line);
      const awayP = europeanCoverProbability(matrix, "away", line);
      const homeCovered = coversEuropean(sample.goalsHome, sample.goalsAway, line);
      const awayCovered = coversEuropean(sample.goalsAway, sample.goalsHome, line);
      add(byLine[String(line)], homeP, homeCovered);
      add(byLine[String(line)], awayP, awayCovered);
      add(byLineSide.home[String(line)], homeP, homeCovered);
      add(byLineSide.away[String(line)], awayP, awayCovered);
    }
  }

  const lines = {};
  const home = {};
  const away = {};
  for (const line of LINES) {
    lines["+" + line] = finish(byLine[String(line)]);
    home["+" + line] = finish(byLineSide.home[String(line)]);
    away["+" + line] = finish(byLineSide.away[String(line)]);
  }
  return { lines, home, away };
}

function main() {
  const rows = loadMatches();
  const samples = buildSamples(rows);
  const { train, test, cutoff } = splitSamples(samples);
  const summary = {
    generatedAt: new Date().toISOString(),
    definition:
      "Cover means the side is strictly ahead after receiving that many goals (European +N). A loss by exactly N is not a cover; on an Asian +N line that score is a push, not a win. Mean predicted and actual cover rate are percentages. Gap is actual minus predicted, in percentage points. Brier is the average squared error of the cover probability (lower is better).",
    dataset: {
      scored: samples.length,
      train: train.length,
      test: test.length,
      testStarts: cutoff,
    },
    test: scoreWindow(test),
    train: scoreWindow(train),
    limitation:
      "The score grid stops at 10 goals and is rescaled, so a tiny share of blowouts beyond 10-0 is folded into the grid. Asian half-lines +(N-0.5) win on the same scores as European +N, so they are not a separate row. Prices are not in the historical files.",
  };

  fs.writeFileSync("data/handicap-backtest.json", JSON.stringify(summary, null, 2) + "\n");
  console.log("Handicap cover calibration, test window from", cutoff);
  for (const [line, row] of Object.entries(summary.test.lines)) {
    console.log(
      line,
      "n=" + row.n,
      "predicted " + row.meanPredicted + "%",
      "actual " + row.actualCoverRate + "%",
      "gap " + row.gap,
      "brier " + row.brier
    );
  }
}

if (require.main === module) main();
