import { useEffect, useState, useMemo } from "react";
import {
  sameNbaMatch,
  resolvePickToOutcome,
  moneylineOdds,
  totalOdds,
} from "../sportyNba.js";

function confFromProb(p) {
  if (p >= 65) return "HIGH";
  if (p >= 55) return "MEDIUM";
  return "LOW";
}

function buildBestPicks(games, limit = 50) {
  const rows = [];
  for (const g of games) {
    const ml = g.prediction.moneyline;
    const ep = g.prediction.expectedPoints || {};
    const isNcaa = (g.competition || "") === "NCAAB";
    let full = Number(ep.total) || 0;

    if (isNcaa && full > 0 && full < 150) full = Math.max(full, 152);
    if (!isNcaa && full > 0 && full < 200) full = Math.max(full, 220);

    let proj1h = full * 0.49;
    let proj2h = full * 0.51;
    if (isNcaa) {
      proj1h = Math.max(proj1h, 76);
      proj2h = Math.max(proj2h, 78);
    }

    const homeFav = ml.home.probability >= ml.away.probability;
    const leanSide = homeFav ? "Home" : "Away";
    const leanTeam = homeFav ? g.homeTeam : g.awayTeam;
    const mlProb = homeFav ? ml.home.probability : ml.away.probability;

    rows.push({
      matchId: String(g.matchId),
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      matchLabel: g.awayTeam + " @ " + g.homeTeam,
      leanKey: leanSide + " Win",
      market: leanSide + " Win · " + leanTeam,
      probability: mlProb,
      confidence: confFromProb(mlProb),
      kickoff: g.kickoff,
      competition: g.competition || "NBA",
      marketType: "moneyline",
      projected: full,
      projected1h: proj1h,
      projected2h: proj2h,
    });

    if (full > 0) {
      const mid = isNcaa ? 156 : 228;
      const side = full >= mid ? "Over" : "Under";
      const edge = Math.min(18, Math.abs(full - mid) * 1.2);
      const prob = Math.round(Math.min(78, 52 + edge) * 10) / 10;
      rows.push({
        matchId: g.matchId + "-tot",
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        matchLabel: g.awayTeam + " @ " + g.homeTeam,
        leanKey: side + " full",
        market: side + " full · proj " + Math.round(full * 10) / 10,
        probability: prob,
        confidence: confFromProb(prob),
        kickoff: g.kickoff,
        competition: g.competition || "NBA",
        marketType: "total",
        totalSide: side,
        projected: full,
        projected1h: proj1h,
        projected2h: proj2h,
      });
    }

    if (proj1h > 0) {
      const mid1 = isNcaa ? 78 : 110;
      const side = proj1h >= mid1 ? "Over" : "Under";
      const edge = Math.min(16, Math.abs(proj1h - mid1) * 1.4);
      const prob = Math.round(Math.min(76, 53 + edge) * 10) / 10;
      rows.push({
        matchId: g.matchId + "-1h",
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        matchLabel: g.awayTeam + " @ " + g.homeTeam,
        leanKey: "1H " + side,
        market: "1H " + side + " · proj " + Math.round(proj1h * 10) / 10,
        probability: prob,
        confidence: confFromProb(prob),
        kickoff: g.kickoff,
        competition: g.competition || "NBA",
        marketType: "1h_total",
        totalSide: side,
        projected: full,
        projected1h: proj1h,
        projected2h: proj2h,
      });
    }

    if (proj2h > 0) {
      const mid2 = isNcaa ? 80 : 112;
      const side = proj2h >= mid2 ? "Over" : "Under";
      const edge = Math.min(16, Math.abs(proj2h - mid2) * 1.4);
      const prob = Math.round(Math.min(76, 53 + edge) * 10) / 10;
      rows.push({
        matchId: g.matchId + "-2h",
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        matchLabel: g.awayTeam + " @ " + g.homeTeam,
        leanKey: "2H " + side,
        market: "2H " + side + " · proj " + Math.round(proj2h * 10) / 10,
        probability: prob,
        confidence: confFromProb(prob),
        kickoff: g.kickoff,
        competition: g.competition || "NBA",
        marketType: "2h_total",
        totalSide: side,
        projected: full,
        projected1h: proj1h,
        projected2h: proj2h,
      });
    }
  }

  return rows.sort((a, b) => b.probability - a.probability).slice(0, limit);
}

function isToday(kickoff) {
  if (!kickoff) return false;
  const wat = new Date(new Date(kickoff).getTime() + 60 * 60 * 1000);
  const now = new Date(Date.now() + 60 * 60 * 1000);
  return wat.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
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
  const [targetOdds, setTargetOdds] = useState(10);

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

  const allGames = useMemo(() => [...nba, ...ncaa], [nba, ncaa]);
  const bestAll = useMemo(() => buildBestPicks(allGames, 60), [allGames]);
  const bestNba = useMemo(() => buildBestPicks(nba, 30), [nba]);
  const bestNcaa = useMemo(() => buildBestPicks(ncaa, 30), [ncaa]);
  const todayPicks = useMemo(
    () => buildBestPicks(allGames.filter((g) => new Date(g.kickoff).getTime() > Date.now() && new Date(g.kickoff).getTime() < Date.now() + 24 * 60 * 60 * 1000), 80),
    [allGames]
  );

  async function bookPicks(picks, mode, target) {
    setStatus("loading");
    setBookError("");
    setCode("");
    setUrl("");
    setSkipped([]);
    setSummary("");

    try {
      const listRes = await fetch("/api/sporty-book?sport=basketball");
      const list = await listRes.json();
      if (!list.ok) {
        throw new Error(list.message || "Could not load SportyBet basketball");
      }

      const findEv = (pick) =>
        (list.events || []).find((e) =>
          sameNbaMatch(pick.homeTeam, pick.awayTeam, e.home, e.away)
        );

      const oddsOf = (pick) => {
        const ev = findEv(pick);
        if (!ev) return null;
        const out = resolvePickToOutcome(pick, ev);
        if (!out) return null;
        if ((pick.marketType || "moneyline") === "moneyline") {
          return moneylineOdds(ev, pick);
        }
        return totalOdds(ev, {
          marketId: out.marketId,
          specifier: out.specifier,
          outcomeId: out.outcomeId,
        });
      };

      let chosen = picks;
      if (mode === "top") {
        chosen = picks.filter((p) => oddsOf(p)).slice(0, target);
      } else if (mode === "odds") {
        const eligible = picks.filter((p) => oddsOf(p));
        chosen = [];
        let run = 1;
        for (const p of eligible) {
          const o = oddsOf(p);
          if (!o) continue;
          const next = run * o;
          if (next >= target) {
            if (
              chosen.length === 0 ||
              Math.abs(Math.log(next / target)) <
                Math.abs(Math.log(run / target))
            ) {
              chosen.push(p);
            }
            break;
          }
          chosen.push(p);
          run = next;
        }
      }

      const outcomes = [];
      const missed = [];
      let combined = 1;
      const seenEventMarket = new Set();

      for (const pick of chosen) {
        const ev = findEv(pick);
        if (!ev) {
          missed.push(pick.matchLabel);
          continue;
        }
        const out = resolvePickToOutcome(pick, ev);
        if (!out) {
          missed.push(pick.matchLabel + " (" + (pick.marketType || "") + ")");
          continue;
        }
        const dedupe =
          out.eventId + "|" + out.marketId + "|" + (out.specifier || "");
        if (seenEventMarket.has(dedupe)) continue;
        seenEventMarket.add(dedupe);

        const o = oddsOf(pick);
        if (o) combined *= o;

        const payload = {
          eventId: out.eventId,
          marketId: out.marketId,
          outcomeId: out.outcomeId,
        };
        if (out.specifier) payload.specifier = out.specifier;
        outcomes.push(payload);
      }

      setSkipped(missed);
      if (outcomes.length === 0) {
        throw new Error(
          "None matched SportyBet. Only " +
            (list.count || 0) +
            " events listed, but none of these games are on SportyBet right now (started games and games too far ahead are not listed). Try Best 5."
        );
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

      setSummary(
        outcomes.length + " picks · combined odds \~" + combined.toFixed(2)
      );
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
        Moneyline + full / 1H / 2H totals
        {nbaMeta?.matchCount != null ? " · NBA " + nbaMeta.matchCount : ""}
        {ncaaMeta?.matchCount != null ? " · NCAAB " + ncaaMeta.matchCount : ""}
      </p>

      <div style={styles.bestBox}>
        <h2 style={styles.bestTitle}>Best Picks (all markets)</h2>
        {bestAll.slice(0, 20).map((p, i) => (
          <div key={p.matchId + "-all"} style={styles.bestRow}>
            <div style={styles.rank}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={styles.market}>
                <span
                  style={
                    p.competition === "NCAAB" ? styles.miniNcaa : styles.miniNba
                  }
                >
                  {p.competition}
                </span>{" "}
                <span style={styles.mtag}>{p.marketType}</span> {p.market}
              </div>
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
          disabled={status === "loading"}
          onClick={() => bookPicks(bestAll, "all")}
        >
          {status === "loading"
            ? "Booking…"
            : "Book all Best Picks on SportyBet NG"}
        </button>
        <button
          type="button"
          style={{ ...styles.button, marginTop: "8px" }}
          disabled={status === "loading"}
          onClick={() => bookPicks(bestAll, "top", 5)}
        >
          Best 5 picks
        </button>
        <button
          type="button"
          style={{ ...styles.button, marginTop: "8px" }}
          disabled={status === "loading"}
          onClick={() => bookPicks(bestAll, "top", 10)}
        >
          Best 10 picks
        </button>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          <input
            type="number"
            min="2"
            step="1"
            value={targetOdds}
            onChange={(e) => setTargetOdds(e.target.value)}
            style={styles.input}
          />
          <button
            type="button"
            style={{ ...styles.button, marginTop: 0, flex: 1 }}
            disabled={status === "loading"}
            onClick={() =>
              bookPicks(bestAll, "odds", Number(targetOdds) || 10)
            }
          >
            Around {targetOdds} odds
          </button>
        </div>

        <div style={styles.todayBox}>
          <div style={styles.todayTitle}>
            Today’s games · {todayPicks.length} leans (all markets)
          </div>
          <button
            type="button"
            style={{ ...styles.button, marginTop: "8px" }}
            disabled={status === "loading" || todayPicks.length === 0}
            onClick={() => bookPicks(todayPicks, "all")}
          >
            Book all today’s leans on SportyBet NG
          </button>
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
        {status === "error" && <div style={styles.err}>{bookError}</div>}
        <p style={styles.hint}>
          Markets: moneyline (219), full O/U (225), 1H O/U (68), 2H O/U (228).
          Booking uses the closest live SportyBet line (e.g. 156.5), not a fake
          145.5. Half models are approximate.
        </p>
      </div>

      <h2 style={{ fontSize: "16px", margin: "18px 0 10px" }}>NBA top leans</h2>
      <div style={styles.bestBox}>
        {bestNba.slice(0, 12).map((p, i) => (
          <div key={p.matchId + "-nba"} style={styles.bestRow}>
            <div style={styles.rank}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={styles.market}>
                <span style={styles.mtag}>{p.marketType}</span> {p.market}
              </div>
              <div style={styles.matchLabel}>{p.matchLabel}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.prob}>{p.probability}%</div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "16px", margin: "18px 0 10px" }}>
        NCAAB top leans
      </h2>
      <div style={{ ...styles.bestBox, borderColor: "rgba(34,211,238,0.35)" }}>
        {bestNcaa.slice(0, 12).map((p, i) => (
          <div key={p.matchId + "-ncaa"} style={styles.bestRow}>
            <div
              style={{
                ...styles.rank,
                background: "linear-gradient(90deg,#22d3ee,#3b82f6)",
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.market}>
                <span style={styles.mtag}>{p.marketType}</span> {p.market}
              </div>
              <div style={styles.matchLabel}>{p.matchLabel}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.prob}>{p.probability}%</div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "16px", margin: "20px 0 10px" }}>All NBA games</h2>
      {nba.map((g) => (
        <GameCard key={"nba-" + g.matchId} g={g} />
      ))}

      <h2 style={{ fontSize: "16px", margin: "20px 0 10px" }}>
        All NCAAB games
      </h2>
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
    background: "linear-gradient(90deg, #f97316, #ef4444)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  market: { fontSize: "13px", fontWeight: 700 },
  matchLabel: { fontSize: "12px", color: "#a191c4", marginTop: "2px" },
  prob: { fontSize: "16px", fontWeight: 900, color: "#22e584" },
  conf: { fontSize: "11px", color: "#a191c4", fontWeight: 700 },
  miniNba: { fontSize: "10px", color: "#fdba74", fontWeight: 800 },
  miniNcaa: { fontSize: "10px", color: "#67e8f9", fontWeight: 800 },
  mtag: {
    fontSize: "9px",
    textTransform: "uppercase",
    color: "#c4b5fd",
    marginRight: "4px",
  },
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
  input: {
    width: "80px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #444",
    background: "#1a1a1a",
    color: "#fff",
    fontSize: "15px",
  },
  todayBox: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.04)",
  },
  todayTitle: { fontSize: "13px", fontWeight: 700, color: "#e0c4ff" },
  result: { marginTop: "12px", textAlign: "center" },
  code: { fontSize: "22px", fontWeight: 900, letterSpacing: "2px" },
  link: { color: "#fdba74", fontSize: "13px" },
  skip: { marginTop: "8px", fontSize: "11px", color: "#a191c4" },
  err: { marginTop: "10px", color: "#fca5a5", fontSize: "13px" },
  hint: {
    marginTop: "8px",
    fontSize: "11px",
    color: "#a191c4",
    lineHeight: 1.4,
  },
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
