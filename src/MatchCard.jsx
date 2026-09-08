function confidenceColor(confidence) {
  switch (confidence) {
    case "VERY HIGH": return "#22c55e";
    case "HIGH": return "#4ade80";
    case "MEDIUM": return "#facc15";
    case "LOW": return "#fb923c";
    default: return "#ef4444";
  }
}

export default function MatchCard({ competition, homeTeam, awayTeam, kickoff, prediction, onSelect }) {
  const { matchResult, btts, overUnder, expectedGoals } = prediction;

  const pills = [
    { label: "Home Win", value: matchResult.homeWin, icon: "🏠" },
    { label: "Draw", value: matchResult.draw, icon: "🤝" },
    { label: "Away Win", value: matchResult.awayWin, icon: "✈️" },
    { label: "BTTS", value: btts.yes, icon: "⚽" },
    { label: "Over 1.5", value: overUnder.over15, icon: "📈" },
    { label: "Over 2.5", value: overUnder.over25, icon: "📈" },
  ];

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        {competition && <div style={styles.competitionTag}>{competition}</div>}
        {kickoff && (
          <div style={styles.kickoff}>
            {new Date(kickoff).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        )}
      </div>

      <div style={styles.header}>
        <span style={styles.team}>{homeTeam}</span>
        <span style={styles.vs}>VS</span>
        <span style={{ ...styles.team, textAlign: "right" }}>{awayTeam}</span>
      </div>

      <div style={styles.xgRow}>
        <span style={styles.xgLabel}>Expected Goals</span>
        <span style={styles.xgValue}>{expectedGoals.home} – {expectedGoals.away}</span>
      </div>

      <div style={styles.grid}>
        {pills.map((p, i) => (
          <div key={i} style={styles.pill}>
            <div style={styles.pillTop}>
              <span>{p.icon} {p.label}</span>
            </div>
            <div style={styles.pillBottom}>
              <span style={styles.pillValue}>{p.value.probability}%</span>
              <span style={{ ...styles.pillDot, background: confidenceColor(p.value.confidence) }} />
            </div>
          </div>
        ))}
      </div>

      <button style={styles.button} onClick={() => onSelect({ competition, homeTeam, awayTeam, kickoff, prediction })}>
        View Full Analysis →
      </button>
    </div>
  );
}

const styles = {
  card: {
    background: "linear-gradient(145deg, #16161d, #0f0f14)",
    border: "1px solid #24242e",
    borderRadius: "16px",
    padding: "18px",
    margin: "14px 0",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  competitionTag: {
    background: "#1e293b",
    color: "#93c5fd",
    fontSize: "10px",
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  kickoff: {
    color: "#666",
    fontSize: "11px",
    fontWeight: 600,
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  team: {
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  vs: {
    color: "#555",
    fontSize: "11px",
    fontWeight: 700,
  },
  xgRow: {
    display: "flex",
    justifyContent: "space-between",
    background: "#1a1a22",
    borderRadius: "8px",
    padding: "8px 12px",
    marginBottom: "14px",
  },
  xgLabel: { fontSize: "12px", color: "#888" },
  xgValue: { fontSize: "12px", fontWeight: 700, color: "#ddd" },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    marginBottom: "14px",
  },
  pill: {
    background: "#1a1a22",
    borderRadius: "10px",
    padding: "8px 10px",
  },
  pillTop: {
    fontSize: "10px",
    color: "#999",
    marginBottom: "4px",
    whiteSpace: "nowrap",
  },
  pillBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pillValue: { fontSize: "16px", fontWeight: 800, color: "#fff" },
  pillDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px",
    width: "100%",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
