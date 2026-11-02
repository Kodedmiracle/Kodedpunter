import { useEffect, useState, useMemo } from "react";
import { sameNbaMatch, nbaLeanToSporty } from "../sportyNba.js";

function buildBestPicks(games, limit = 12) {
  return games
    .map((g) => {
      const ml = g.prediction.moneyline;
      const tp = g.prediction.totalPoints || {};
      const ep = g.prediction.expectedPoints || {};
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
        competition: g.competition || "NBA",
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit);
}

function GameCard({ g }) {
  const ml = g.prediction.moneyline;
  const tp = g.prediction.totalPoints || {};
  const ep = g.prediction.expectedPoints || {};
  const homeFav = ml.home.probability >= ml.away.probability;
  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <span style={g.competition === "NCAAB" ? styles.tagNcaa : styles.tag}>
          {g.competition || "NBA"}
        </span>
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
          <div style={styles.label}>Total O/U {tp.line ?? "—"}</div>
          <div style={styles.sub}>Projected {ep.total ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}

function BestBlock({ title, best, accent, bookSlot }) {
  return (
    <div style={{ ...styles.bestBox, borderColor: accent }}>
      <h2 style={styles.bestTitle}>{title}</h2>
      {best.length === 0 && (
        <p style={styles.hint}>No picks yet — run the generator.</p>
      )}
      {best.map((p, i) => (
        <div key={p.matchId + title} style={styles.bestRow}>
          <div style={{ ...styles.rank, background: accent }}>{i + 1}</div>
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
      {bookSlot}
    </div>
  );
}

export default function Basketball() {
  const [nba, setNba] = useState([]);
  const [ncaa, setNcaa] = useState([]);
  const [nbaMeta, setNbaMeta] = useState(null);
  const [ncaaMeta, setNcaaMeta] = useState(null);
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
      fetch("/nba-predictions.json").then((r) => (r.ok ? r.json() : [])),
      fetch("/ncaa-predictions.json").then((r) => (r.ok ? r.json() : [])),
      fetch("/nba-meta.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/ncaa-meta.json")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([nbaData, ncaaData, nm, cm]) => {
        setNba(nbaData);
        setNcaa(ncaaData);
        setNbaMeta(nm);
        setNcaaMeta(cm);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const nbaBest = useMemo(() => buildBestPicks(nba, 12), [nba]);
  const ncaaBest = useMemo(() => buildBestPicks(ncaa, 12), [ncaa]);

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

      const chosen = nbaBest.slice(0, limit || nbaBest.length);
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

  if (loading) return <div className="page">Loading basketball…</div>;
  if (error) return <div className="page">Error: {error}</div>;

  return (
    <div className="page">
      <h1>Basketball</h1>
      <p style={{ color: "#a191c4", fontSize: "13px", marginBottom: "16px" }}>
        NBA + NCAAB moneyline leans
        {nbaMeta?.generatedAt
          ? " · NBA " + new Date(nbaMeta.generatedAt).toLocaleString()
          : ""}
        {ncaaMeta?.matchCount != null ? " · NCAAB " + ncaaMeta.matchCount + " games" : ""}
      </p>

      <BestBlock
        title="NBA Best Picks"
        best={nbaBest}
        accent="linear-gradient(90deg, #f97316, #ef4444)"
        bookSlot={
          <>
            <button
              type="button"
              style={styles.button}
              disabled={status === "loading" || nbaBest.length === 0}
              onClick={() => bookBestPicks(12)}
            >
              {status === "loading" ? "Booking…" : "Book NBA Best Picks on SportyBet NG"}
            </button>
            <button
              type="button"
              style={{ ...styles.button, marginTop: "8px", opacity: 0.9 }}
              disabled={status === "loading" || nbaBest.length === 0}
              onClick={() => bookBestPicks(5)}
            >
              Book NBA top 5 only
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
              NBA moneyline booking. NCAAB is shown below (book later when SportyBet lists them).
            </p>
          </>
        }
      />

      <BestBlock
        title="NCAAB Best Picks"
        best={ncaaBest}
        accent="linear-gradient(90deg, #22d3ee, #3b82f6)"
      />

      <h2 style={{ fontSize: "16px", margin: "20px 0 10px" }}>NBA games</h2>
      {nba.map((g) => (
        <GameCard key={"nba-" + g.matchId} g={g} />
      ))}

      <h2 style={{ fontSize: "16px", margin: "20px 0 10px" }}>NCAAB games</h2>
      {ncaa.map((g) => (
        <GameCard key={"ncaa-" + g.matchId} g={g} />
      ))}
    </div>
  );
}

const styles = {
  bestBox: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(249,115,22,0.35)",
    borderRadius: "18px",
    padding: "16px",
    marginBottom: "16px",
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
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    background: "linear-gradient(90deg, #f97316, #ef4444)",
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
  tagNcaa: {
    background: "linear-gradient(90deg, #22d3ee, #3b82f6)",
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
