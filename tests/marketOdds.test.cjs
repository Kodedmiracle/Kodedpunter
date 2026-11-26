const test = require("node:test");
const assert = require("node:assert/strict");
const { demargin1x2, blend1x2, valueFlag } = require("../src/engine/marketOdds.cjs");

test("de-vigged prices sum to 1 and sit below the raw implied chance", () => {
  const market = demargin1x2({ home: 2, draw: 3.4, away: 4 });
  const sum = market.home + market.draw + market.away;
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(market.overround > 1);
  assert.ok(market.home < 1 / 2);
});

test("blend sits between the model and the market", () => {
  const model = { home: 0.6, draw: 0.22, away: 0.18 };
  const market = { home: 0.4, draw: 0.3, away: 0.3 };
  const blended = blend1x2(model, market, 0.5);
  assert.ok(blended.home < model.home && blended.home > market.home);
  const sum = blended.home + blended.draw + blended.away;
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("value flag appears only when the model is clearly above the price", () => {
  const model = { home: 0.55, draw: 0.25, away: 0.2 };
  const market = { home: 0.45, draw: 0.3, away: 0.25 };
  const flag = valueFlag(model, market);
  assert.equal(flag.selection, "Home Win");
  assert.ok(flag.edge >= 4);

  const close = valueFlag(model, { home: 0.53, draw: 0.26, away: 0.21 });
  assert.equal(close, null);
});
