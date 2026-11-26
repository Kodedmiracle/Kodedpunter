const test = require("node:test");
const assert = require("node:assert/strict");
const { totalOverProbability, totalMarket } = require("../src/basketball/totals.cjs");
const { formFromLastFive } = require("../src/basketball/formFromLastFive.cjs");

test("a total on the projection is a coin flip, and a higher projection leans over", () => {
  const even = totalOverProbability(224, 224, 16.5);
  const high = totalOverProbability(236, 224, 16.5);
  assert.ok(Math.abs(even - 50) < 0.2);
  assert.ok(high > 70);
  const market = totalMarket(236, 224, 16.5);
  assert.equal(market.side, "Over");
});

test("last-five form accepts a numeric score, not only quarter arrays", () => {
  const parsed = formFromLastFive(7, [
    {
      date: "2026-11-20T00:00:00Z",
      homeTeam: { id: 7, displayName: "Celtics" },
      awayTeam: { id: 8, displayName: "Heat" },
      homeScore: 118,
      awayScore: 109,
    },
    {
      date: "2026-11-18T00:00:00Z",
      homeTeam: { id: 9, displayName: "Knicks" },
      awayTeam: { id: 7, displayName: "Celtics" },
      state: { score: { home: 100, away: 110 } },
    },
  ]);
  assert.equal(parsed.games, 2);
  assert.ok(parsed.ppg > 100);
  assert.equal(parsed.wins, 2);
  assert.ok(parsed.last > 0);
});
