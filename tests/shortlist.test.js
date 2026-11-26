import test from "node:test";
import assert from "node:assert/strict";
import { buildBestPicks } from "../src/basketball/shortlist.js";

const future = "2026-12-01T00:00:00Z";
const past = "2020-01-01T00:00:00Z";

function game(over) {
  return {
    competition: over.competition || "NBA",
    matchId: over.matchId,
    homeTeam: over.home,
    awayTeam: over.away,
    kickoff: over.kickoff || future,
    prediction: {
      noBet: over.noBet || false,
      noBetReason: over.reason || null,
      moneyline: {
        home: { probability: over.homeP || 60, confidence: over.conf || "MEDIUM" },
        away: { probability: 100 - (over.homeP || 60), confidence: "LOW" },
      },
      expectedPoints: { total: over.total || 220 },
      totalPoints: { line: over.line || 220 },
    },
  };
}

test("the NBA shortlist keeps NBA games and drops college and started games", () => {
  const picks = buildBestPicks(
    [
      game({ matchId: "nba1", home: "Boston Celtics", away: "Miami Heat" }),
      game({
        matchId: "ncaa1",
        competition: "NCAAB",
        home: "Duke",
        away: "UNC",
        homeP: 80,
      }),
      game({
        matchId: "old",
        home: "Lakers",
        away: "Suns",
        kickoff: past,
        homeP: 90,
      }),
      game({
        matchId: "close",
        home: "Knicks",
        away: "Nets",
        noBet: true,
        reason: "projected gap is under 3.5 points",
        homeP: 70,
      }),
      game({
        matchId: "noform",
        home: "Bulls",
        away: "Pistons",
        noBet: true,
        reason: "no recent-form data yet",
        homeP: 64,
        conf: "NO BET",
      }),
    ],
    20,
    { competition: "NBA" }
  );

  const ids = picks.map((p) => String(p.matchId));
  assert.ok(ids.some((id) => id.startsWith("nba1")));
  assert.ok(ids.some((id) => id.startsWith("noform")));
  assert.equal(ids.some((id) => id.startsWith("ncaa1")), false);
  assert.equal(ids.some((id) => id.startsWith("old")), false);
  assert.equal(ids.some((id) => id.startsWith("close")), false);
  assert.ok(picks.every((p) => p.competition === "NBA"));
});
