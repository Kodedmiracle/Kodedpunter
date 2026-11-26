import { hasKickedOff } from "../kickoff.js";
import { totalMarket, sigmaFor } from "./totals.cjs";

function confFromProb(p) {
  if (p >= 65) return "HIGH";
  if (p >= 58) return "MEDIUM";
  return "LOW";
}

export function formOnlyNoBet(prediction) {
  if (!prediction || !prediction.noBet) return false;
  const reason = String(prediction.noBetReason || "").toLowerCase();
  return reason.includes("form") || reason.includes("recent");
}

export function hideFromShortlist(game) {
  const prediction = game && game.prediction;
  if (!prediction) return true;
  if (prediction.noBet && !formOnlyNoBet(prediction)) return true;
  return false;
}

export function buildBestPicks(games, limit = 30, options = {}) {
  const rows = [];
  const want = options.competition || null;

  for (const g of games || []) {
    if (!g || !g.prediction) continue;
    const competition = g.competition || "NBA";
    if (want && competition !== want) continue;
    if (hasKickedOff(g.kickoff)) continue;
    if (hideFromShortlist(g)) continue;

    const ml = g.prediction.moneyline;
    if (!ml || !ml.home || !ml.away) continue;
    const homeFav = ml.home.probability >= ml.away.probability;
    const probability = homeFav ? ml.home.probability : ml.away.probability;
    const raw = homeFav ? ml.home.confidence : ml.away.confidence;
    const confidence =
      raw === "NO BET" || raw === "NO_BET" ? confFromProb(probability) : raw || confFromProb(probability);
    const projected = Number(g.prediction.expectedPoints && g.prediction.expectedPoints.total) || 0;
    const label = g.awayTeam + " @ " + g.homeTeam;
    const sideName = homeFav ? "Home" : "Away";
    const team = homeFav ? g.homeTeam : g.awayTeam;

    rows.push({
      matchId: String(g.matchId),
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      matchLabel: label,
      leanKey: sideName + " Win",
      market: sideName + " Win · " + team,
      probability,
      confidence,
      kickoff: g.kickoff,
      competition,
      marketType: "moneyline",
      projected,
    });

    const line = Number(g.prediction.totalPoints && g.prediction.totalPoints.line);
    const shaped = totalMarket(projected, line, sigmaFor(competition));
    if (shaped && shaped.probability >= 58) {
      rows.push({
        matchId: String(g.matchId) + "-tot",
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        matchLabel: label,
        leanKey: shaped.side + " full",
        market:
          shaped.side +
          " full · line " +
          line +
          " · proj " +
          shaped.projected,
        probability: shaped.probability,
        confidence: "MEDIUM",
        kickoff: g.kickoff,
        competition,
        marketType: "total",
        totalSide: shaped.side,
        projected,
      });
    }
  }

  return rows.sort((a, b) => b.probability - a.probability).slice(0, limit);
}
