import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Tracker() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  async function loadPredictions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setPredictions(data);
    }
    setLoading(false);
  }

  async function markResult(id, correct) {
    await supabase
      .from("predictions")
      .update({ correct, actual_result: correct ? "won" : "lost" })
      .eq("id", id);

    setPredictions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, correct, actual_result: correct ? "won" : "lost" } : p))
    );
  }

  const settled = predictions.filter((p) => p.correct !== null);
  const pending = predictions.filter((p) => p.correct === null);
  const wins = settled.filter((p) => p.correct).length;
  const accuracy = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(1) : null;

  return (
    <div className="page">
      <h1>Tracker</h1>
      <p>Your tracked picks and accuracy over time.</p>

      {loading && <p style={styles.status}>Loading...</p>}
      {error && <p style={styles.status}>Error: {error}</p>}

      {!loading && !error && predictions.length === 0 && (
        <p style={styles.status}>
          No tracked picks yet. Tap "Track this pick" on any match card to start.
        </p>
      )}

      {!loading && settled.length > 0 && (
        <div style={styles.statsCard}>
          <span style={styles.statsLabel}>Accuracy</span>
          <span style={styles.statsValue}>{accuracy}%</span>
          <span style={styles.statsSub}>
            {wins} of {settled.length} settled picks correct
          </span>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Pending ({pending.length})</h2>
          {pending.map((p) => (
            <div key={p.id} style={styles.card}>
              <div style={styles.matchLine}>
                {p.home_team} vs {p.away_team}
              </div>
              <div style={styles.metaLine}>
                {p.competition} · {p.market} · {p.confidence}%
              </div>
              <div style={styles.btnRow}>
                <button style={styles.winBtn} onClick={() => markResult(p.id, true)}>
                  ✓ Won
                </button>
                <button style={styles.lossBtn} onClick={() => markResult(p.id, false)}>
                  ✕ Lost
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {settled.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Settled ({settled.length})</h2>
          {settled.map((p) => (
            <div key={p.id} style={styles.card}>
              <div style={styles.matchLine}>
                {p.home_team} vs {p.away_team}
              </div>
              <div style={styles.metaLine}>
                {p.competition} · {p.market} · {p.confidence}%
              </div>
              <div
                style={{
                  ...styles.resultTag,
                  color: p.correct ? "#22e584" : "#f5445c",
                }}
              >
                {p.correct ? "✓ Correct" : "✕ Incorrect"}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  status: {
    color: "#a191c4",
    fontSize: "14px",
  },
  statsCard: {
    background: "linear-gradient(145deg, #8b5cf6, #ec4899)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statsLabel: {
    color: "#fff",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    fontWeight: 700,
    opacity: 0.85,
  },
  statsValue: {
    color: "#fff",
    fontSize: "40px",
    fontWeight: 900,
  },
  statsSub: {
    color: "#fff",
    fontSize: "12px",
    opacity: 0.85,
  },
  sectionTitle: {
    color: "#c9baE4",
    fontSize: "14px",
    fontWeight: 800,
    marginTop: "20px",
    marginBottom: "10px",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "14px 16px",
    marginBottom: "10px",
  },
  matchLine: {
    color: "#fff",
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "4px",
  },
  metaLine: {
    color: "#a191c4",
    fontSize: "12px",
    marginBottom: "10px",
  },
  btnRow: {
    display: "flex",
    gap: "8px",
  },
  winBtn: {
    flex: 1,
    background: "rgba(34,229,132,0.15)",
    border: "1px solid rgba(34,229,132,0.4)",
    color: "#22e584",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  lossBtn: {
    flex: 1,
    background: "rgba(245,68,92,0.15)",
    border: "1px solid rgba(245,68,92,0.4)",
    color: "#f5445c",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  resultTag: {
    fontSize: "13px",
    fontWeight: 800,
  },
};

export default Tracker;
