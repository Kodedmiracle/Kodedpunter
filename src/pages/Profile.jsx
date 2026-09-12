import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function Profile() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", session.user.id);

    setPredictions(data || []);
    setLoading(false);
  }

  const settled = predictions.filter((p) => p.correct !== null);
  const wins = settled.filter((p) => p.correct).length;
  const accuracy = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(1) : null;

  const marketCounts = {};
  settled.forEach((p) => {
    if (!marketCounts[p.market]) marketCounts[p.market] = { total: 0, correct: 0 };
    marketCounts[p.market].total += 1;
    if (p.correct) marketCounts[p.market].correct += 1;
  });

  const bestMarket = Object.entries(marketCounts)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total)[0];

  return (
    <div className="page">
      <h1>Profile</h1>
      <p>Your accuracy and how the model works.</p>

      {loading && <p style={styles.status}>Loading...</p>}

      {!loading && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{predictions.length}</span>
            <span style={styles.statLabel}>Total Tracked</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{accuracy !== null ? `${accuracy}%` : "—"}</span>
            <span style={styles.statLabel}>Accuracy</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{settled.length}</span>
            <span style={styles.statLabel}>Settled</span>
          </div>
        </div>
      )}

      {bestMarket && (
        <div style={styles.bestMarketCard}>
          <span style={styles.bestMarketLabel}>🔥 Best market</span>
          <span style={styles.bestMarketValue}>
            {bestMarket[0]} — {bestMarket[1].correct}/{bestMarket[1].total} correct
          </span>
        </div>
      )}

      <footer style={styles.footer}>
        <p style={styles.footerTitle}>How this works</p>
        <p style={styles.footerText}>
          Predictions come from a Poisson goal model built on each team's
          season goals scored/conceded, weighted recent form, and home
          advantage. Markets like BTTS and Over/Under are derived directly
          from the resulting expected-goals distribution — not separately
          guessed. Teams with fewer than 10 games played this season are
          pulled toward the league average to avoid overreacting to small
          samples. These are statistical estimates, not guarantees.
        </p>
      </footer>

      <div style={styles.disclaimerCard}>
        <p style={styles.disclaimerText}>
          Kodedpunter is a statistical modeling project, not betting advice.
          If you choose to use these predictions for wagering, only stake
          what you can afford to lose. 18+.
        </p>
      </div>
    </div>
  );
}

const styles = {
  status: {
    color: "#a191c4",
    fontSize: "14px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    marginBottom: "16px",
  },
  statCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "16px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: 900,
    color: "#fff",
  },
  statLabel: {
    fontSize: "10px",
    color: "#a191c4",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 700,
  },
  bestMarketCard: {
    background: "linear-gradient(90deg, rgba(139,92,246,0.18), rgba(236,72,153,0.18))",
    border: "1px solid rgba(236,72,153,0.4)",
    borderRadius: "12px",
    padding: "12px 14px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  bestMarketLabel: {
    fontSize: "10px",
    color: "#e0c4ff",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 800,
  },
  bestMarketValue: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#fff",
  },
  footer: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  footerTitle: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#c9baE4",
    marginBottom: "8px",
  },
  footerText: {
    fontSize: "12px",
    color: "#6b5c8a",
    lineHeight: 1.6,
  },
  disclaimerCard: {
    marginTop: "20px",
    padding: "14px",
    background: "rgba(251,191,36,0.08)",
    border: "1px solid rgba(251,191,36,0.25)",
    borderRadius: "12px",
  },
  disclaimerText: {
    fontSize: "11px",
    color: "#fbbf24",
    lineHeight: 1.5,
  },
};

export default Profile;
