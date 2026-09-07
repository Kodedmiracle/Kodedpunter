export default function MatchCard({ homeTeam, awayTeam, prediction }) {
  const { matchResult, btts, overUnder, expectedGoals } = prediction;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.team}>{homeTeam}</span>
        <span style={styles.vs}>vs</span>
        <span style={styles.team}>{awayTeam}</span>
      </div>

      <div style={styles.xg}>
        Expected Goals: {expectedGoals.home} - {expectedGoals.away}
      </div>

      <div style={styles.highlights}>
        <div style={styles.pill}>
          🏠 Home Win — {matchResult.homeWin.probability}%
        </div>
        <div style={styles.pill}>
          ⚽ BTTS — {btts.yes.probability}%
        </div>
        <div style={styles.pill}>
          📈 Over 1.5 — {overUnder.over15.probability}%
        </div>
        <div style={styles.pill}>
          📈 Over 2.5 — {overUnder.over25.probability}%
        </div>
      </div>
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
  },
  pill: {
    background: "#2a2a2a",
    borderRadius: "20px",
    padding: "6px 12px",
    fontSize: "13px",
  },
};
