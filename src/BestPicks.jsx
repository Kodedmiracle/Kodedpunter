import { useState } from "react";
import { sameMatch } from "./sportyNames.js";
import { leanToSporty } from "./sportyMarkets.js";

export default function BestPicks({ picks }) {
  const [status, setStatus] = useState("idle");
  const [code, setCode] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState([]);
  const [summary, setSummary] = useState("");
  const [targetOdds, setTargetOdds] = useState(10);

  if (!picks || picks.length === 0) return null;

  async function bookOnSporty(mode, target) {
    setStatus("loading");
    setError("");
    setCode("");
    setUrl("");
    setSkipped([]);
    setSummary("");

    try {
      const listRes = await fetch("/api/sporty-book");
      const list = await listRes.json();
      if (!list.ok) throw new Error(list.message || "Could not load SportyBet fixtures");

      const outcomes = [];
      const missed = [];

      const oddsOf = (pick) => {
        const lean = leanToSporty(pick.leanKey);
        if (!lean) return null;
        const ev = (list.events || []).find((e) =>
          sameMatch(pick.homeTeam, pick.awayTeam, e.home, e.away)
        );
        if (!ev || !ev.odds) return null;
        return ev.odds[lean.marketId + "|" + (lean.specifier || "") + "|" + lean.outcomeId] || null;
      };

      let combined = 1;
      let chosen = picks;
      if (mode === "top" || mode === "odds") {
        const eligible = picks.filter((p) => oddsOf(p));
        if (mode === "top") {
          chosen = eligible.slice(0, target);
        } else {
          chosen = [];
          let run = 1;
          for (const p of eligible) {
            const next = run * oddsOf(p);
            if (next >= target) {
              if (
                chosen.length === 0 ||
                Math.abs(Math.log(next / target)) < Math.abs(Math.log(run / target))
              ) {
                chosen.push(p);
              }
              break;
            }
            chosen.push(p);
            run = next;
          }
        }
      }

      for (const pick of chosen) {
        const lean = leanToSporty(pick.leanKey);
        if (!lean) {
          missed.push(pick.matchLabel + " (unknown market)");
          continue;
        }
        const ev = (list.events || []).find((e) =>
          sameMatch(pick.homeTeam, pick.awayTeam, e.home, e.away)
        );
        if (!ev) {
          missed.push(pick.matchLabel);
          continue;
        }
        const outcome = {
          eventId: ev.eventId,
          marketId: lean.marketId,
          outcomeId: lean.outcomeId,
        };
        if (lean.specifier) outcome.specifier = lean.specifier;
        const oo = oddsOf(pick);
        if (oo) combined *= oo;
        outcomes.push(outcome);
      }

      setSkipped(missed);

      if (outcomes.length === 0) {
        throw new Error("None of these picks matched a SportyBet fixture");
      }

      const bookRes = await fetch("/api/sporty-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomes }),
      });
      const booked = await bookRes.json();
      if (!booked.ok) throw new Error(booked.message || "SportyBet rejected the slip");

      setSummary(outcomes.length + " picks · combined odds " + combined.toFixed(2));
      setCode(booked.shareCode);
      setUrl(booked.shareURL);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔥 Best Picks</h2>
      {picks.map((pick, i) => (
        <div key={i} style={styles.row}>
          <div style={styles.rank}>{i + 1}</div>
          <div style={styles.info}>
            <div style={styles.market}>{pick.market}</div>
            <div style={styles.matchLabel}>{pick.matchLabel}</div>
          </div>
          <div style={styles.right}>
            <div style={styles.probability}>{pick.probability}%</div>
            <div style={styles.confidence}>{pick.confidence}</div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          type="button"
          onClick={() => bookOnSporty("all")}
          disabled={status === "loading"}
          style={styles.button}
        >
          {status === "loading" ? "Booking…" : "Book all on SportyBet NG"}
        </button>
        <button
          type="button"
          onClick={() => bookOnSporty("top", 5)}
          disabled={status === "loading"}
          style={styles.button}
        >
          Best 5 picks
        </button>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="number"
            min="2"
            step="1"
            value={targetOdds}
            onChange={(e) => setTargetOdds(e.target.value)}
            style={{ width: "80px", padding: "12px", borderRadius: "10px", border: "1px solid #444", background: "#1a1a1a", color: "#fff", fontSize: "15px" }}
          />
          <button
            type="button"
            onClick={() => bookOnSporty("odds", Number(targetOdds) || 10)}
            disabled={status === "loading"}
            style={{ ...styles.button, width: "auto", flex: 1 }}
          >
            Around {targetOdds} odds
          </button>
        </div>
      </div>

      {status === "done" && (
        <div style={styles.result}>
          <div style={styles.code}>{code}</div>
          {summary && <div style={styles.skip}>{summary}</div>}
          <a href={url} style={styles.link} target="_blank" rel="noreferrer">
            Open slip on SportyBet
          </a>
          {skipped.length > 0 && (
            <div style={styles.skip}>Skipped: {skipped.join(", ")}</div>
          )}
        </div>
      )}

      {status === "error" && <div style={styles.err}>{error}</div>}
    </div>
  );
}

const styles = {
  container: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "20px",
    color: "#fff",
    fontFamily: "sans-serif",
    boxShadow: "0 8px 24px rgba(139,92,246,0.08)",
  },
  title: { fontSize: "18px", fontWeight: 800, marginBottom: "12px" },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  rank: {
    width: "24px",
    fontSize: "14px",
    background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 900,
  },
  info: { flex: 1 },
  market: { fontSize: "14px", fontWeight: 700 },
  matchLabel: { fontSize: "12px", color: "#a191c4", marginTop: "2px" },
  right: { textAlign: "right" },
  probability: { fontSize: "16px", fontWeight: 900, color: "#22e584" },
  confidence: { fontSize: "11px", color: "#a191c4", fontWeight: 700 },
  button: {
    marginTop: "14px",
    width: "100%",
    border: 0,
    borderRadius: "12px",
    padding: "12px",
    fontWeight: 800,
    color: "#fff",
    background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
  },
  result: { marginTop: "12px", textAlign: "center" },
  code: { fontSize: "22px", fontWeight: 900, letterSpacing: "2px" },
  link: { color: "#c4b5fd", fontSize: "13px" },
  skip: { marginTop: "8px", fontSize: "11px", color: "#a191c4" },
  err: { marginTop: "10px", color: "#fca5a5", fontSize: "13px" },
};
