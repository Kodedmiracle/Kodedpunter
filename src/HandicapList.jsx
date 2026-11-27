import { useMemo, useState } from "react";
import { useSlip } from "./SlipContext";
import { sameMatch } from "./sportyNames.js";
import { hasKickedOff } from "./kickoff.js";
import {
  choosePositiveHandicap,
  europeanQuote,
  asianHalfQuote,
  feedHasHandicapPrices,
} from "./engine/handicap.cjs";

function findEvent(events, match) {
  return (events || []).find((event) =>
    sameMatch(match.homeTeam, match.awayTeam, event.home, event.away)
  );
}

function rowsForMatch(match, target, events) {
  const matrix = match.prediction && match.prediction.scoreMatrix;
  if (!matrix || hasKickedOff(match.kickoff)) return [];
  const event = findEvent(events, match);
  const rows = [];
  for (const side of ["home", "away"]) {
    const pick = choosePositiveHandicap(matrix, side, target);
    if (!pick) continue;
    const team = side === "home" ? match.homeTeam : match.awayTeam;
    const opponent = side === "home" ? match.awayTeam : match.homeTeam;
    const european = europeanQuote(event, side, pick.line);
    const asian = asianHalfQuote(event, side, pick.line);
    rows.push({
      id: [match.matchId || match.homeTeam, match.awayTeam, side, pick.line].join("|"),
      match,
      side,
      team,
      opponent,
      line: pick.line,
      probability: pick.probability,
      asianHalf: pick.asianHalf,
      asianPush: pick.asianPush,
      european,
      asian,
      eventFound: Boolean(event),
    });
  }
  return rows;
}

export default function HandicapList({ matches, events }) {
  const [target, setTarget] = useState(80);
  const { toggleLeg, isSelected } = useSlip();
  const pricesKnown = Array.isArray(events);
  const feedHasPrices = feedHasHandicapPrices(events);

  const rows = useMemo(() => {
    const out = [];
    for (const match of matches || []) out.push(...rowsForMatch(match, target, events));
    out.sort((a, b) => a.line - b.line || b.probability - a.probability);
    return out;
  }, [matches, events, target]);

  if (!matches || matches.length === 0) return null;

  function addLeg(row) {
    if (!row.european) return;
    toggleLeg({
      homeTeam: row.match.homeTeam,
      awayTeam: row.match.awayTeam,
      kickoff: row.match.kickoff,
      matchId: row.match.matchId,
      matchLabel: row.team + " +" + row.line + " vs " + row.opponent,
      leanKey: "European +" + row.line + " " + row.side,
      market: row.team + " +" + row.line,
      probability: row.probability,
      sporty: {
        marketId: row.european.marketId,
        outcomeId: row.european.outcomeId,
        specifier: row.european.specifier,
      },
    });
  }

  return (
    <section style={styles.box}>
      <div style={styles.head}>
        <h2 style={styles.title}>Handicap</h2>
        <label style={styles.target}>
          At least
          <input
            type="number"
            min="60"
            max="95"
            step="1"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value) || 80)}
            style={styles.input}
          />
          %
        </label>
      </div>
      <p style={styles.note}>
        Smallest positive handicap whose model cover chance reaches {target}%.
        +1 means a draw still covers. That is the same as Asian +0.5. An Asian
        +1 pushes, it does not win, if they lose by exactly one.
      </p>
      {pricesKnown && !feedHasPrices && (
        <p style={styles.note}>
          SportyBet handicap prices are not in this feed, so the list is the
          model only and cannot be added to a slip.
        </p>
      )}
      {!pricesKnown && (
        <p style={styles.note}>Checking SportyBet for handicap prices.</p>
      )}
      {rows.length === 0 && (
        <p style={styles.note}>No side reaches {target}% even at +5.</p>
      )}
      {rows.map((row) => {
        const selected = row.european
          ? isSelected({
              homeTeam: row.match.homeTeam,
              awayTeam: row.match.awayTeam,
              kickoff: row.match.kickoff,
              matchId: row.match.matchId,
              leanKey: "European +" + row.line + " " + row.side,
            })
          : false;
        const canBook = Boolean(feedHasPrices && row.european);
        return (
          <div key={row.id} style={styles.row}>
            <div style={{ flex: 1 }}>
              <div style={styles.team}>
                {row.team} +{row.line}
              </div>
              <div style={styles.meta}>
                vs {row.opponent}
                {row.match.competition ? " · " + row.match.competition : ""}
              </div>
              <div style={styles.meta}>
                European +{row.line} · Asian +{row.asianHalf}. An Asian +{row.line}{" "}
                pushes about {row.asianPush}% of the time (a {row.line}-goal loss).
              </div>
              {row.european ? (
                <div style={styles.price}>
                  SportyBet European {row.european.odds.toFixed(2)} · implied{" "}
                  {row.european.implied}% after the margin
                </div>
              ) : (
                <div style={styles.meta}>Model only. This line is not priced on SportyBet.</div>
              )}
              {row.asian && (
                <div style={styles.price}>
                  Asian +{row.asian.line} {row.asian.odds.toFixed(2)} · implied{" "}
                  {row.asian.implied}%
                </div>
              )}
            </div>
            <div style={styles.right}>
              <div style={styles.prob}>{row.probability}%</div>
              {canBook && (
                <button type="button" style={styles.button} onClick={() => addLeg(row)}>
                  {selected ? "Remove" : "Add to slip"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

const styles = {
  box: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "18px",
    padding: "16px",
    margin: "8px 0 18px",
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  title: { margin: 0, fontSize: "18px", fontWeight: 800 },
  target: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#a191c4",
    fontSize: "13px",
  },
  input: {
    width: "64px",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "#120a22",
    color: "#fff",
    fontSize: "14px",
  },
  note: { color: "#a191c4", fontSize: "12px", lineHeight: 1.5, margin: "8px 0" },
  row: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    padding: "10px 0",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  team: { fontWeight: 800, fontSize: "14px" },
  meta: { color: "#a191c4", fontSize: "12px", marginTop: "2px" },
  price: { color: "#c4b5fd", fontSize: "12px", marginTop: "4px" },
  right: { textAlign: "right", minWidth: "92px" },
  prob: { fontWeight: 900, color: "#22e584", fontSize: "16px" },
  button: {
    marginTop: "6px",
    border: 0,
    borderRadius: "10px",
    padding: "8px 10px",
    fontWeight: 800,
    color: "#fff",
    background: "#8b5cf6",
    cursor: "pointer",
  },
};
