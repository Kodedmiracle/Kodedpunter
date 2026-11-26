import test from "node:test";
import assert from "node:assert/strict";
import { applyMarketToMatch } from "../src/applyMarket.js";

test("a matched SportyBet price moves the displayed home chance and can flag value", () => {
  const match = {
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    prediction: {
      matchResult: {
        homeWin: { probability: 55, confidence: "MEDIUM" },
        draw: { probability: 25, confidence: "LOW" },
        awayWin: { probability: 20, confidence: "VERY LOW" },
      },
      doubleChance: {},
      btts: { yes: { probability: 60, confidence: "MEDIUM" } },
    },
  };
  const events = [
    {
      home: "Arsenal",
      away: "Chelsea",
      odds: { "1||1": 2.4, "1||2": 3.4, "1||3": 3.1 },
    },
  ];
  const next = applyMarketToMatch(match, events);
  assert.ok(next.prediction.market);
  assert.ok(next.prediction.matchResult.homeWin.probability < 55);
  assert.equal(next.prediction.btts.yes.probability, 60);
  assert.equal(next.prediction.value && next.prediction.value.selection, "Home Win");
});
