import { useEffect, useState } from "react";

export default function Basketball() {
  const [games, setGames] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <div className="page">Loading NBA…</div>;
  if (error) return <div className="page">Error: {error}</div>;

  return (
    <div className="page">
      <h1>NBA</h1>
      <p style={{ color: "#a191c4", fontSize: "13px" }}>
        Moneyline + projected total (model v1)
        {meta?.generatedAt
          ? " · updated " + new Date(meta.generatedAt).toLocaleString()
          : ""}
      </p>

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
            <div style={styles.row}>
              <div style={styles.box}>
                <div style={styles.label}>Moneyline</div>
                <div style={styles.big}>
                  {homeFav ? "Home" : "Away"}{" "}
                  {homeFav ? ml.home.probability : ml.away.probability}%
                </div>
                <div style={styles.sub}>
                  Home {ml.home.probability}% · Away {ml.away.probability}%
                </div>
              </div>
              <div style={styles.box}>
                <div style={styles.label}>Total points</div>
                <div style={styles.big}>O/U {tp.line}</div>
                <div style={styles.sub}>
                  Projected {ep.total} ({ep.away}–{ep.home})
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
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
    marginBottom: "12px",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    alignItems: "center",
  },
  at: { color: "#f97316", fontSize: "12px" },
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
  big: { fontSize: "16px", fontWeight: 900, color: "#22e584" },
  sub: { fontSize: "11px", color: "#a191c4", marginTop: "4px" },
};
