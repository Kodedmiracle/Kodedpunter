import { useEffect, useState, useMemo } from "react";
import {
  sameNbaMatch,
  resolvePickToOutcome,
  moneylineOdds,
  totalOdds,
} from "../sportyNba.js";
import { buildBestPicks } from "../basketball/shortlist.js";
import { hasKickedOff } from "../kickoff.js";

function onePerGame(list) {
  const byGame = new Map();
  for (const p of list) {
    const cur = byGame.get(p.matchLabel);
    if (!cur) {
      byGame.set(p.matchLabel, p);
    } else if (p.marketType === "moneyline" && cur.marketType !== "moneyline") {
      byGame.set(p.matchLabel, p);
    }
  }
  return list.filter((p) => byGame.get(p.matchLabel) === p);
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
    ])
      .then(([nbaData, ncaaData]) => {
        setNba(Array.isArray(nbaData) ? nbaData.filter((g) => g.competition === "NBA") : []);
        setNcaa(Array.isArray(ncaaData) ? ncaaData : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const upcomingNba = useMemo(
    () => nba.filter((g) => g.competition === "NBA" && !hasKickedOff(g.kickoff)),
    [nba]
  );
  const upcomingNcaa = useMemo(
    () => ncaa.filter((g) => !hasKickedOff(g.kickoff)),
    [ncaa]
  );
  const bestNba = useMemo(
    () => buildBestPicks(upcomingNba, 20, { competition: "NBA" }),
    [upcomingNba]
  );
  const bestNcaa = useMemo(
    () => buildBestPicks(upcomingNcaa, 12, { competition: "NCAAB" }),
    [upcomingNcaa]
  );
  const todayPicks = useMemo(
    () =>
      buildBestPicks(
        upcomingNba.filter(
          (g) => new Date(g.kickoff).getTime() < Date.now() + 24 * 60 * 60 * 1000
        ),
        40,
        { competition: "NBA" }
      ),
    [upcomingNba]
  );
  const oddsPool = useMemo(
    () => buildBestPicks(upcomingNba, 400, { competition: "NBA" }),
    [upcomingNba]
  );

  async function bookPicks(allPicks, mode, target) {
    const picks = onePerGame(allPicks).filter((p) => !hasKickedOff(p.kickoff));
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
        NBA moneylines and full-game totals. College games stay in their own list.
        {" · NBA upcoming " + upcomingNba.length}
        {" · NCAAB upcoming " + upcomingNcaa.length}
      </p>

      <div style={styles.bestBox}>
        <h2 style={styles.bestTitle}>NBA best picks</h2>
        {bestNba.length === 0 && (
          <p style={styles.hint}>No upcoming NBA leans right now.</p>
        )}
        {bestNba.map((p, i) => (
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
          onClick={() => bookPicks(bestNba, "all")}
        >
          {status === "loading"
            ? "Booking…"
            : "Book NBA picks on SportyBet NG"}
        </button>
        <button
          type="button"
          style={{ ...styles.button, marginTop: "8px" }}
          disabled={status === "loading"}
          onClick={() => bookPicks(bestNba, "top", 5)}
        >
          Best 5 NBA picks
        </button>
        <button
          type="button"
          style={{ ...styles.button, marginTop: "8px" }}
          disabled={status === "loading"}
          onClick={() => bookPicks(bestNba, "top", 10)}
        >
          Best 10 NBA picks
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
              bookPicks(oddsPool, "odds", Number(targetOdds) || 10)
            }
          >
            Around {targetOdds} odds
          </button>
        </div>

        <div style={styles.todayBox}>
          <div style={styles.todayTitle}>
            NBA games in the next 24 hours · {todayPicks.length} leans
          </div>
          <button
            type="button"
            style={{ ...styles.button, marginTop: "8px" }}
            disabled={status === "loading" || todayPicks.length === 0}
            onClick={() => bookPicks(todayPicks, "all")}
          >
            Book upcoming NBA leans on SportyBet NG
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
          NBA only. Totals use the projected score against the quoted line.
          Games that have already started are left out.
        </p>
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
      {upcomingNba.map((g) => (
        <GameCard key={"nba-" + g.matchId} g={g} />
      ))}

      <h2 style={{ fontSize: "16px", margin: "20px 0 10px" }}>
        All NCAAB games
      </h2>
      {upcomingNcaa.map((g) => (
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
