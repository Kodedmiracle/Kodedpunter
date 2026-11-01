import { useState } from "react";
import { useSlip } from "./SlipContext";
import { sameMatch } from "./sportyNames.js";
import { leanToSporty } from "./sportyMarkets.js";

export default function SlipBar() {
  const { legs, clearSlip } = useSlip();
  const [status, setStatus] = useState("idle");
  const [code, setCode] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState([]);

  if (legs.length === 0 && status === "idle") return null;

  async function bookSelected() {
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

      for (const pick of legs) {
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
      if (!booked.ok) {
        throw new Error(booked.message || "SportyBet rejected the slip");
      }

      setCode(booked.shareCode);
      setUrl(booked.shareURL);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <div style={styles.bar}>
      {status === "done" ? (
        <div style={styles.doneBox}>
          <div style={styles.code}>{code}</div>
          <a href={url} style={styles.link} target="_blank" rel="noreferrer">
            Open slip on SportyBet
          </a>
          {skipped.length > 0 && (
            <div style={styles.skip}>Skipped: {skipped.join(", ")}</div>
          )}
          <button
            type="button"
            style={styles.clearBtn}
            onClick={() => {
              clearSlip();
              setStatus("idle");
              setCode("");
              setUrl("");
              setError("");
              setSkipped([]);
            }}
          >
            Clear slip
          </button>
        </div>
      ) : (
        <>
          <div style={styles.left}>
            <strong>{legs.length}</strong> selected
          </div>
          <button
            type="button"
            style={styles.bookBtn}
            disabled={status === "loading" || legs.length === 0}
            onClick={bookSelected}
          >
            {status === "loading" ? "Booking…" : "Book selected"}
          </button>
          <button type="button" style={styles.clearBtn} onClick={clearSlip}>
            Clear
          </button>
        </>
      )}
      {status === "error" && <div style={styles.err}>{error}</div>}
    </div>
  );
}

const styles = {
  bar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: "64px",
    zIndex: 40,
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    borderTop: "1px solid rgba(139,92,246,0.4)",
    padding: "10px 14px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  left: { flex: 1, fontSize: "14px" },
  bookBtn: {
    border: 0,
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 800,
    color: "#fff",
    background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
  },
  clearBtn: {
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 700,
    color: "#c9baE4",
    background: "transparent",
  },
  doneBox: { width: "100%", textAlign: "center" },
  code: { fontSize: "20px", fontWeight: 900, letterSpacing: "2px" },
  link: { color: "#c4b5fd", fontSize: "13px", display: "block", marginTop: "6px" },
  skip: { marginTop: "6px", fontSize: "11px", color: "#a191c4" },
  err: { width: "100%", color: "#fca5a5", fontSize: "12px" },
};
