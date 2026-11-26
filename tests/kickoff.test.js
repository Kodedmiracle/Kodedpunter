import test from "node:test";
import assert from "node:assert/strict";
import { hasKickedOff, isUpcoming } from "../src/kickoff.js";

test("a kickoff in the past counts as started", () => {
  const now = Date.parse("2026-11-26T12:00:00Z");
  assert.equal(hasKickedOff("2026-11-26T11:00:00Z", now), true);
  assert.equal(hasKickedOff("2026-11-26T13:00:00Z", now), false);
  assert.equal(isUpcoming("2026-11-26T13:00:00Z", now), true);
  assert.equal(hasKickedOff("", now), false);
  assert.equal(hasKickedOff("not-a-date", now), false);
});
