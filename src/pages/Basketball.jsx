import { useEffect, useState, useMemo } from "react";
import { sameNbaMatch, nbaLeanToSporty } from "../sportyNba.js";

function buildBestPicks(games, limit = 12) {
  return games
    .map((g) => {
      const ml = g.prediction.moneyline;
      const tp = g.prediction.totalPoints;
      const ep = g.prediction.expectedPoints;
      const homeFav = ml.home.probability >= ml.away.probability;
      const leanSide = homeFav ? "Home" : "Away";
      const leanTeam = homeFav ? g.homeTeam : g.awayTeam;
      const probability = homeFav ? ml.home.probability : ml.away.probability;
      const confidence = homeFav ? ml.home.confidence : ml.away.confidence;
      return {
        matchId: g.matchId,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        matchLabel: g.awayTeam + " @ " + g.homeTeam,
        leanKey: leanSide + " Win",
        leanTeam,
        market: leanSide + " Win · " + leanTeam,
        probability,
        confidence,
        totalLine: tp.line,
        projected: ep.total,
        kickoff: g.kickoff,
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit);
}

export default function Basketball() {
  const [games, setGames] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState("idle");
  const [code, setCode] = useState("");
  const [url, setUrl] = useState("");
  const [bookError, setBookError] = useState("");
  const [skipped, setSkipped] = useState([]);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/nba-predictions.json").then((r) => {
        if (!r.ok) throw new Error("No NBA predictions yet");
        return r.json();
      }),
      fetch("/nba-meta.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([data, m]) => {
        setGames(data);
        setMeta(m);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const best = useMemo(() => buildBestPicks(games, 12), [games]);

  async function bookBestPicks(limit) {
    setStatus("loading");
    setBookError("");
    setCode("");
    setUrl("");
    setSkipped([]);
    setSummary("");

    try {
      const listRes = await fetch("/api/sporty-book?sport=basketball");
      const list = await listRes.json();
      if (!list.ok) throw new Error(list.message || "Could not load SportyBet basketball");

      const chosen = best.slice(0, limit || best.length);
      const outcomes = [];
      const missed = [];

      for (const pick of chosen) {
        const lean = nbaLeanToSporty(pick.leanKey);
        if (!lean) {
          missed.push(pick.matchLabel + " (unknown market)");
          continue;
        }
        const ev = (list.events || []).find((e) =>
          sameNbaMatch(pick.homeTeam, pick.awayTeam, e.home, e.away)
        );
        if (!ev) {
          missed.push(pick.matchLabel);
          continue;
        }
        outcomes.push({
          eventId: ev.eventId,
          marketId: lean.marketId,
          outcomeId: lean.outcomeId,
        });
      }

      setSkipped(missed);
      if (outcomes.length === 0) {
        throw new Error("None of these NBA picks matched SportyBet fixtures");
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

      setSummary(outcomes.length + " NBA picks booked");
      setCode(booked.shareCode);
      setUrl(booked.shareURL);
      setStatus("done");
    } catch (err) {
      setBookError(err.message);
      setStatus("error");
    }
  }

  if (loading) return <div className="page">Loading NBA…</div>;
  if (error) return <div className="page">Error: {error}</div>;

  return (
    <div className="page">
      <h1>NBA</h1>
      <p style={{ color: "#a191c4", fontSize: "13px", marginBottom: "16px" }}>
        Moneyline best picks + full board
        {meta?.generatedAt
          ? " · updated " + new Date(meta.generatedAt).toLocaleString()
          : ""}
      </p>

      <div style={styles.bestBox}>
        <h2 style={styles.bestTitle}>Best Picks</h2>
        {best.map((p, i) => (
          <div key={p.matchId + "-best"} style={styles.bestRow}>
            <div style={styles.rank}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={styles.market}>{p.market}</div>
              <div style={styles.matchLabel}>{p.matchLabel}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.prob}>{p.probability}%</div>
              <div style={styles.conf}>{p.confidence}</div>
            </div>
          </div>
        ))}

        <button
          type="button"
          style={styles.button}
          disabled={status === "loading" || best.length === 0}
          onClick={() => bookBestPicks(12)}
        >
          {status === "loading" ? "Booking…" : "Book Best Picks on SportyBet NG"}
        </button>
        <button
          type="button"
          style={{ ...styles.button, marginTop: "8px", opacity: 0.9 }}
          disabled={status === "loading" || best.length === 0}
          onClick={() => bookBestPicks(5)}
        >
          Book top 5 only
        </button>

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
        {status === "error" && <div style={styles.err}>{bookError}</div>}
        <p style={styles.hint}>
          Books moneyline (Home/Away) only for now. Skipped games are not listed on SportyBet yet.
        </p>
      </div>

      <h2 style={{ fontSize: "16px", margin: "20px 0 10px" }}>All games</h2>
      {games.map((g) => {
        const ml = g.prediction.moneyline;
        const tp = g.prediction.totalPoints;
        const ep = g.prediction.expectedPoints;
        const homeFav = ml.home.probability >= ml.away.probability;
        return (
          <div key={g.matchId} style={styles.card}>
            <div style={styles.top}>
              <span style={styles.tag}>NBA</span>
              <span style={styles.when}>
                {g.kickoff
                  ? new Date(g.kickoff).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""}
              </span>
            </div>
            <div style={styles.teams}>
              <span>{g.awayTeam}</span>
              <span style={styles.at}>@</span>
              <span>{g.homeTeam}</span>
            </div>
            <div style={styles.lean}>
              Model lean: {homeFav ? "Home" : "Away"}{" "}
              {homeFav ? ml.home.probability : ml.away.probability}%
            </div>
            <div style={styles.row}>
              <div style={styles.box}>
                <div style={styles.label}>Moneyline</div>
                <div style={styles.sub}>
                  Home {ml.home.probability}% · Away {ml.away.probability}%
                </div>
              </div>
              <div style={styles.box}>
                <div style={styles.label}>Total O/U {tp.line}</div>
                <div style={styles.sub}>Projected {ep.total}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  bestBox: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(249,115,22,0.35)",
    borderRadius: "18px",
    padding: "16px",
    marginBottom: "8px",
  },
  bestTitle: { fontSize: "18px", fontWeight: 800, margin: "0 0 12px" },
  bestRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  rank: {
    width: "22px",
    fontWeight: 900,
    background: "linear-gradient(90deg, #f97316, #ef4444)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  market: { fontSize: "14px", fontWeight: 700 },
  matchLabel: { fontSize: "12px", color: "#a191c4", marginTop: "2px" },
  prob: { fontSize: "16px", fontWeight: 900, color: "#22e584" },
  conf: { fontSize: "11px", color: "#a191c4", fontWeight: 700 },
  button: {
    marginTop: "14px",
    width: "100%",
    border: 0,
    borderRadius: "12px",
    padding: "12px",
    fontWeight: 800,
    color: "#fff",
    background: "linear-gradient(90deg, #f97316, #ef4444)",
  },
  result: { marginTop: "12px", textAlign: "center" },
  code: { fontSize: "22px", fontWeight: 900, letterSpacing: "2px" },
  link: { color: "#fdba74", fontSize: "13px" },
  skip: { marginTop: "8px", fontSize: "11px", color: "#a191c4" },
  err: { marginTop: "10px", color: "#fca5a5", fontSize: "13px" },
  hint: { marginTop: "8px", fontSize: "11px", color: "#a191c4", lineHeight: 1.4 },
  card: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "12px",
    color: "#fff",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    fontSize: "11px",
    color: "#a191c4",
  },
  tag: {
    background: "linear-gradient(90deg, #f97316, #ef4444)",
    color: "#fff",
    fontWeight: 800,
    borderRadius: "999px",
    padding: "3px 10px",
    fontSize: "10px",
  },
  when: {},
  teams: {
    fontWeight: 800,
    fontSize: "15px",
    marginBottom: "8px",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    alignItems: "center",
  },
  at: { color: "#f97316", fontSize: "12px" },
  lean: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#22e584",
    marginBottom: "10px",
  },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" },
  box: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: "12px",
    padding: "10px",
  },
  label: {
    fontSize: "10px",
    color: "#a191c4",
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: "4px",
  },
  sub: { fontSize: "12px", color: "#ddd" },
};
