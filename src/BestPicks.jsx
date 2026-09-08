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
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  title: { fontSize: "18px", marginBottom: "12px" },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #2a2a2a",
  },
  rank: {
    width: "24px",
    fontSize: "14px",
    color: "#888",
    fontWeight: "bold",
  },
  info: { flex: 1 },
  market: { fontSize: "14px", fontWeight: "bold" },
  matchLabel: { fontSize: "12px", color: "#888", marginTop: "2px" },
  right: { textAlign: "right" },
  probability: { fontSize: "15px", fontWeight: "bold", color: "#4ade80" },
  confidence: { fontSize: "11px", color: "#888" },
};
