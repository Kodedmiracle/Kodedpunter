import { useState } from "react";
import { sameMatch } from "./sportyNames.js";
import { leanToSporty } from "./sportyMarkets.js";
import { getRecommendedMarket } from "./bestPicks.js";

export default function BookToday({ matches, allMatches }) {
  const [status, setStatus] = useState("idle");
  const [code, setCode] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState([]);

  if (!matches || matches.length === 0) return null;

  async function bookOnSporty() {
    setStatus("loading");
    setError("");
    setCode("");
    setUrl("");
    setSkipped([]);

    try {
      const listRes = await fetch("/api/sporty-book");
      const list = await listRes.json();
      if (!list.ok) throw new Error(list.message || "Could not load SportyBet fixtures");

      const outcomes = [];
      const missed = [];

      for (const m of matches) {
        const lean = getRecommendedMarket(m, allMatches);
        if (!lean) {
          missed.push(`${m.homeTeam} vs ${m.awayTeam} (no lean)`);
          continue;
        }
        const sporty = leanToSporty(lean.key);
        if (!sporty) {
          missed.push(`${m.homeTeam} vs ${m.awayTeam} (unknown market)`);
          continue;
        }
        const ev = (list.events || []).find((e) =>
          sameMatch(m.homeTeam, m.awayTeam, e.home, e.away)
        );
        if (!ev) {
          missed.push(`${m.homeTeam} vs ${m.awayTeam}`);
          continue;
        }
        const outcome = { eventId: ev.eventId, marketId: sporty.marketId, outcomeId: sporty.outcomeId };
        if (sporty.specifier) outcome.specifier = sporty.specifier;
        outcomes.push(outcome);
      }

      setSkipped(missed);

      if (outcomes.length === 0) {
        throw new Error("None of today's matches matched a SportyBet fixture");
      }

      const bookRes = await fetch("/api/sporty-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomes }),
      });
      const booked = await bookRes.json();
      if (!booked.ok) throw new Error(booked.message || "SportyBet rejected the slip");

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
      <h2 style={styles.title}>📅 Book Today's Games</h2>
      <p style={styles.sub}>{matches.length} matches today, including extra leagues not yet in Best Picks</p>

      <button
        type="button"
        onClick={bookOnSporty}
        disabled={status === "loading"}
        style={styles.button}
      >
        {status === "loading" ? "Booking…" : "Book All Today on SportyBet NG"}
      </button>

      {status === "done" && (
        <div style={styles.result}>
          <div style={styles.code}>{code}</div>
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
    background: "linear-gradient(160deg, #0f1f33, #0a1522)",
    border: "1px solid rgba(56,189,248,0.25)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "20px",
    color: "#fff",
    fontFamily: "sans-serif",
    boxShadow: "0 8px 24px rgba(56,189,248,0.08)",
  },
  title: { fontSize: "18px", fontWeight: 800, marginBottom: "6px" },
  sub: { fontSize: "13px", color: "#94a3b8", marginBottom: "14px" },
  button: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(90deg, #0ea5e9, #6366f1)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
  },
  result: { marginTop: "14px", textAlign: "center" },
  code: { fontSize: "22px", fontWeight: 800, letterSpacing: "2px" },
  link: { color: "#7dd3fc", fontSize: "14px" },
  skip: { fontSize: "12px", color: "#94a3b8", marginTop: "8px" },
  err: { color: "#f87171", marginTop: "10px", fontSize: "14px" },
};
