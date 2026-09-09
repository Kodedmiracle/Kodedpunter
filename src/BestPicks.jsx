export default function BestPicks({ picks }) {
  if (!picks || picks.length === 0) return null;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔥 Best Picks</h2>
      {picks.map((pick, i) => (
        <div key={i} style={styles.row}>
          <div style={styles.rank}>{i + 1}</div>
          <div style={styles.info}>
            <div style={styles.market}>{pick.market}</div>
            <div style={styles.matchLabel}>{pick.matchLabel}</div>
          </div>
          <div style={styles.right}>
            <div style={styles.probability}>{pick.probability}%</div>
            <div style={styles.confidence}>{pick.confidence}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "20px",
    color: "#fff",
    fontFamily: "sans-serif",
    boxShadow: "0 8px 24px rgba(139,92,246,0.08)",
  },
  title: { fontSize: "18px", fontWeight: 800, marginBottom: "12px" },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  rank: {
    width: "24px",
    fontSize: "14px",
    background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 900,
  },
  info: { flex: 1 },
  market: { fontSize: "14px", fontWeight: 700 },
  matchLabel: { fontSize: "12px", color: "#a191c4", marginTop: "2px" },
  right: { textAlign: "right" },
  probability: { fontSize: "16px", fontWeight: 900, color: "#22e584" },
  confidence: { fontSize: "11px", color: "#a191c4", fontWeight: 700 },
};
