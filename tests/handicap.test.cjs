const test = require("node:test");
const assert = require("node:assert/strict");
const {
  europeanCoverProbability,
  asianIntegerSplit,
  choosePositiveHandicap,
  coversEuropean,
  europeanQuote,
  asianHalfQuote,
  feedHasHandicapPrices,
} = require("../src/engine/handicap.cjs");

// A tiny grid: 50% 1-0, 30% 0-0, 20% 0-1. Values are probabilities.
const matrix = [
  [0.3, 0.2],
  [0.5, 0],
];

test("European +1 home covers a draw and a win, not a one-goal loss", () => {
  // 1-0 and 0-0 cover (0.8). 0-1 does not.
  const p = europeanCoverProbability(matrix, "home", 1);
  assert.ok(Math.abs(p - 0.8) < 1e-9);
  assert.equal(coversEuropean(1, 0, 1), true);
  assert.equal(coversEuropean(0, 0, 1), true);
  assert.equal(coversEuropean(0, 1, 1), false);
});

test("Asian +1 pushes on a one-goal loss and that push is not a cover", () => {
  const split = asianIntegerSplit(matrix, "home", 1);
  assert.ok(Math.abs(split.win - 0.8) < 1e-9);
  assert.ok(Math.abs(split.push - 0.2) < 1e-9);
  assert.ok(split.lose < 1e-9);
});

test("the smallest line that reaches 80% is chosen", () => {
  const tight = choosePositiveHandicap(matrix, "home", 80);
  assert.equal(tight.line, 1);
  assert.equal(tight.asianHalf, 0.5);

  // Away +1 covers only if away goals + 1 > home. 0-1: 1+1>0 yes (0.2).
  // 0-0: 1>0 yes (0.3). 1-0: 1>1 no. So 0.5, below 80%.
  // Away +2: a+2 > h. 0-1: 3>0, 0-0: 2>0, 1-0: 2>1. All three, 1.0.
  const wide = choosePositiveHandicap(matrix, "away", 80);
  assert.equal(wide.line, 2);
  assert.equal(choosePositiveHandicap(matrix, "away", 101), null);
});

test("percentage score grids are scaled back to probabilities", () => {
  const percent = [
    [30, 20],
    [50, 0],
  ];
  const p = europeanCoverProbability(percent, "home", 1);
  assert.ok(Math.abs(p - 0.8) < 1e-9);
});

test("SportyBet quotes use the European and Asian handicap ids", () => {
  const event = {
    odds: {
      "14|hcp=1:0|1711": 1.5,
      "14|hcp=1:0|1712": 4.5,
      "14|hcp=1:0|1713": 5.5,
      "16|hcp=0.5|1714": 1.47,
      "16|hcp=0.5|1715": 2.7,
    },
  };
  const euro = europeanQuote(event, "home", 1);
  assert.equal(euro.specifier, "hcp=1:0");
  assert.equal(euro.outcomeId, "1711");
  assert.equal(euro.odds, 1.5);
  assert.ok(euro.implied < 100 / 1.5);

  const asian = asianHalfQuote(event, "home", 1);
  assert.equal(asian.specifier, "hcp=0.5");
  assert.equal(asian.outcomeId, "1714");
  assert.equal(asian.line, 0.5);

  const awayAsian = asianHalfQuote(
    {
      odds: {
        "16|hcp=-1.5|1714": 5.1,
        "16|hcp=-1.5|1715": 1.17,
      },
    },
    "away",
    2
  );
  assert.equal(awayAsian.specifier, "hcp=-1.5");
  assert.equal(awayAsian.outcomeId, "1715");
  assert.equal(feedHasHandicapPrices([event]), true);
  assert.equal(feedHasHandicapPrices([{ odds: { "1||1": 2 } }]), false);
});
