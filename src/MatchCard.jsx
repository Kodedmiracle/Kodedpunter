export default function MatchCard({ competition, homeTeam, awayTeam, kickoff, prediction, onSelect }) {
  const { matchResult, btts, overUnder, expectedGoals } = prediction;

  return (
    <div style={styles.card}>
      {competition && <div style={styles.competitionTag}>{competition}</div>}

      <div style={styles.header}>
        <span style={styles.team}>{homeTeam}</span>
        <span style={styles.vs}>vs</span>
        <span style={styles.team}>{awayTeam}</span>
      </div>

      <div style={styles.xg}>
        Expected Goals: {expectedGoals.home} - {expectedGoals.away}
      </div>

      <div style={styles.highlights}>
        <div style={styles.pill}>🏠 Home Win — {matchResult.homeWin.probability}%</div>
        <div style={styles.pill}>🤝 Draw — {matchResult.draw.probability}%</div>
        <div style={styles.pill}>✈️ Away Win — {matchResult.awayWin.probability}%</div>
        <div style={styles.pill}>⚽ BTTS — {btts.yes.probability}%</div>
        <div style={styles.pill}>📈 Over 1.5 — {overUnder.over15.probability}%</div>
        <div style={styles.pill}>📈 Over 2.5 — {overUnder.over25.probability}%</div>
      </div>

      <button
        style={styles.button}
        onClick={() =>
          onSelect({ competition, homeTeam, awayTeam, kickoff, prediction })
        }
      >
        View Analysis
      </button>
    </div>
  );
}

const styles = {
  card: {
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "16px",
    margin: "12px 0",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  competitionTag: {
    display: "inline-block",
    background: "#333",
    color: "#aaa",
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "10px",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: "16px",
    marginBottom: "8px",
  },
  team: { flex: 1 },
  vs: { opacity: 0.5, fontSize: "12px", margin: "0 8px" },
  xg: { fontSize: "13px", opacity: 0.7, marginBottom: "12px" },
  highlights: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "12px",
  },
  pill: {
    background: "#2a2a2a",
    borderRadius: "20px",
    padding: "6px 12px",
    fontSize: "13px",
  },
  button: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px",
    width: "100%",
    fontSize: "14px",
    fontWeight: "bold",
  },
};
