const test = require("node:test");
const assert = require("node:assert/strict");
const { skipReason } = require("../src/engine/extraLeagueNote.cjs");

test("a missing API-Football key skips collection without throwing", () => {
  const message = skipReason("");
  assert.match(message, /API_FOOTBALL_KEY is not set/);
  assert.match(message, /seven main leagues/);
  assert.equal(skipReason("present"), null);
});
