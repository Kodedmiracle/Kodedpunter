import { useState } from "react";
import { sameMatch } from "./sportyNames.js";
import { leanToSporty } from "./sportyMarkets.js";
import { getRecommendedMarket } from "./bestPicks.js";
import { BOOK_OPTIONS, oddsKey } from "./footballOptions.js";

export default function BookToday({ matches, allMatches }) {
  const [status, setStatus] = useState("idle");
  const [code, setCode] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState([]);
  const [summary, setSummary] = useState("");
  const [optionKey, setOptionKey] = useState("best");
  const [minProb, setMinProb] = useState(80);

  if (!matches || matches.length === 0) return null;

  const option = BOOK_OPTIONS.find((o) => o.key === optionKey) || null;

  function onPick(e) {
    const key = e.target.value;
    setOptionKey(key);
    const o = BOOK_OPTIONS.find((x) => x.key === key);
    if (o) setMinProb(o.minProb);
  }

  async function bookOnSporty() {
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
      let combined = 1;

      for (const m of matches) {
        const label = `${m.homeTeam} vs ${m.awayTeam}`;
        const ev = (list.events || []).find((e) =>
          sameMatch(m.homeTeam, m.awayTeam, e.home, e.away)
        );

        if (option) {
          const p = option.prob(m);
          if (p == null) {
            missed.push(`${label} (no model data)`);
            continue;
          }
          if (!ev) {
            missed.push(label);
            continue;
          }
          if (p < Number(minProb)) {
            missed.push(`${label} (${Math.round(p)}% is below ${minProb}%)`);
            continue;
          }
          const odd = ev.odds && ev.odds[oddsKey(option.sporty)];
          if (!odd) {
            missed.push(`${label} (not offered on SportyBet)`);
            continue;
          }
          combined *= odd;
          const out = {
            eventId: ev.eventId,
            marketId: option.sporty.marketId,
            outcomeId: option.sporty.outcomeId,
          };
          if (option.sporty.specifier) out.specifier = option.sporty.specifier;
          outcomes.push(out);
          continue;
        }

        const lean = getRecommendedMarket(m, allMatches);
        if (!lean) {
          missed.push(`${label} (no lean)`);
          continue;
        }
        const sporty = leanToSporty(lean.key);
        if (!sporty) {
          missed.push(`${label} (unknown market)`);
          continue;
        }
        if (!ev) {
          missed.push(label);
          continue;
        }
        const odd =
          ev.odds &&
          ev.odds[sporty.marketId + "|" + (sporty.specifier || "") + "|" + sporty.outcomeId];
        if (odd) combined *= odd;
        const outcome = { eventId: ev.eventId, marketId: sporty.marketId, outcomeId: sporty.outcomeId };
        if (sporty.specifier) outcome.specifier = sporty.specifier;
        outcomes.push(outcome);
      }

      setSkipped(missed);

      if (outcomes.length === 0) {
        throw new Error("No match qualified for this market. Try a lower percentage or another market.");
      }

      const bookRes = await fetch("/api/sporty-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomes }),
      });
      const booked = await bookRes.json();
      if (!booked.ok) throw new Error(booked.message || "SportyBet rejected the slip");

      setSummary(`${outcomes.length} picks · combined odds ~${combined.toFixed(2)}`);
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

      <select value={optionKey} onChange={onPick} style={styles.select}>
        <option value="best">Best market per match (recommended)</option>
        {BOOK_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>

      {option && (
        <div style={styles.row}>
          <span>Skip matches below</span>
          <input
            type="number"
            min="1"
            max="99"
            value={minProb}
            onChange={(e) => setMinProb(e.target.value)}
            style={styles.num}
          />
          <span>% model chance</span>
        </div>
      )}
      {option && option.approx && (
        <p style={styles.note}>
          First-half numbers are estimates (about 45% of a match's goals are assumed to come in the first half).
        </p>
      )}

      <button
        type="button"
        onClick={bookOnSporty}
        disabled={status === "loading"}
        style={styles.button}
      >
        {status === "loading"
          ? "Booking…"
          : option
          ? `Book ${option.label} on SportyBet NG`
          : "Book All Today on SportyBet NG"}
      </button>

      {status === "done" && (
        <div style={styles.result}>
          <div style={styles.code}>{code}</div>
          <div style={styles.summary}>{summary}</div>
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
  select: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.3)",
    background: "#0a1522",
    color: "#fff",
    fontSize: "14px",
    marginBottom: "10px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#cbd5e1",
    marginBottom: "10px",
  },
  num: {
    width: "64px",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid rgba(148,163,184,0.3)",
    background: "#0a1522",
    color: "#fff",
    fontSize: "14px",
    textAlign: "center",
  },
  note: { fontSize: "12px", color: "#94a3b8", marginBottom: "10px" },
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
  summary: { fontSize: "13px", color: "#cbd5e1", margin: "4px 0 6px" },
  link: { color: "#7dd3fc", fontSize: "14px" },
  skip: { fontSize: "12px", color: "#94a3b8", marginTop: "8px" },
  err: { color: "#f87171", marginTop: "10px", fontSize: "14px" },
};
