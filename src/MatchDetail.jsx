function generateExplanation(match) {
  const { homeTeam, awayTeam, prediction } = match;
  const { matchResult, btts, overUnder, expectedGoals } = prediction;

  const favoredResult =
    matchResult.homeWin.probability >= matchResult.awayWin.probability &&
    matchResult.homeWin.probability >= matchResult.draw.probability
      ? `${homeTeam} winning`
      : matchResult.awayWin.probability >= matchResult.draw.probability
      ? `${awayTeam} winning`
      : "a draw";

  const favoredProb = Math.max(
    matchResult.homeWin.probability,
    matchResult.draw.probability,
    matchResult.awayWin.probability
  );

  const goalTendency =
    overUnder.over25.probability >= 60
      ? "This looks like a high-scoring match"
      : overUnder.over25.probability <= 40
      ? "This looks like a tighter, lower-scoring match"
      : "This could go either way on goals";

  const bttsNote =
    btts.yes.probability >= 60
      ? `both teams have a strong chance of scoring (${btts.yes.probability}%)`
      : `it's less likely both teams find the net (${btts.yes.probability}% BTTS)`;

  return `The model favors ${favoredResult} at ${favoredProb}%, with expected goals of ${expectedGoals.home} for ${homeTeam} and ${expectedGoals.away} for ${awayTeam}. ${goalTendency}, and ${bttsNote}. These are statistical estimates based on current season form and results — not guaranteed outcomes.`;
}

function confidenceColor(confidence) {
  switch (confidence) {
    case "VERY HIGH": return "#22e584";
    case "HIGH": return "#4ade80";
    case "MEDIUM": return "#fbbf24";
    case "LOW": return "#fb923c";
    default: return "#f5445c";
  }
}

export default function MatchDetail({ match, onBack }) {
  const { competition, homeTeam, awayTeam, kickoff, prediction } = match;
  const { matchResult, doubleChance, btts, overUnder, topScorelines, expectedGoals } = prediction;

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={onBack}>
        ← Back to matches
      </button>

      {competition && <div style={styles.competitionTag}>{competition}</div>}

      <h2 style={styles.title}>
        {homeTeam} <span style={styles.vsInline}>vs</span> {awayTeam}
      </h2>
      {kickoff && (
        <p style={styles.kickoff}>{new Date(kickoff).toLocaleString()}</p>
      )}

      <div style={styles.xgBox}>
        Expected Goals: <span style={styles.xgValue}>{expectedGoals.home} – {expectedGoals.away}</span>
      </div>

      <p style={styles.explanation}>{generateExplanation(match)}</p>

      <Section title="Match Result">
        <Row label="Home Win" data={matchResult.homeWin} />
        <Row label="Draw" data={matchResult.draw} />
        <Row label="Away Win" data={matchResult.awayWin} />
      </Section>

      <Section title="Double Chance">
        <Row label="Home or Draw" data={doubleChance.homeOrDraw} />
        <Row label="Home or Away" data={doubleChance.homeOrAway} />
        <Row label="Draw or Away" data={doubleChance.drawOrAway} />
      </Section>

      <Section title="Both Teams To Score">
        <Row label="Yes" data={btts.yes} />
        <Row label="No" data={btts.no} />
      </Section>

      <Section title="Over / Under Goals">
        <Row label="Over 1.5" data={overUnder.over15} />
        <Row label="Under 1.5" data={overUnder.under15} />
        <Row label="Over 2.5" data={overUnder.over25} />
        <Row label="Under 2.5" data={overUnder.under25} />
        <Row label="Over 3.5" data={overUnder.over35} />
        <Row label="Under 3.5" data={overUnder.under35} />
      </Section>

      <Section title="Most Likely Scorelines">
        {topScorelines.map((s, i) => (
          <div key={i} style={styles.scoreRow}>
            <span style={styles.scoreValue}>{s.score}</span>
            <span style={styles.scoreProb}>{s.probability}%</span>
          </div>
        ))}
      </Section>

      <p style={styles.footerNote}>
        All figures are model probabilities, not guarantees.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, data }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowRight}>
        <span style={styles.rowProb}>{data.probability}%</span>
        <span style={{ ...styles.confDot, background: confidenceColor(data.confidence) }} />
        <span style={styles.confText}>{data.confidence}</span>
      </span>
    </div>
  );
}

const styles = {
  container: {
    background: "radial-gradient(circle at 20% 0%, #1c0f38 0%, #0a0510 55%)",
    minHeight: "100vh",
    padding: "20px",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#22d3ee",
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "16px",
    padding: 0,
  },
  competitionTag: {
    display: "inline-block",
    background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
    color: "#fff",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 10px",
    borderRadius: "20px",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  title: { fontSize: "21px", fontWeight: 800, marginBottom: "4px" },
  vsInline: { color: "#ec4899", fontSize: "14px", fontWeight: 700 },
  kickoff: { color: "#a191c4", fontSize: "13px", marginBottom: "14px" },
  xgBox: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "14px",
    color: "#a191c4",
    marginBottom: "16px",
  },
  xgValue: { color: "#fff", fontWeight: 800 },
  explanation: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#c9baE4",
    marginBottom: "22px",
  },
  section: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "14px",
  },
  sectionTitle: {
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#a191c4",
    marginBottom: "10px",
    letterSpacing: "0.6px",
    fontWeight: 800,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  rowLabel: { color: "#e5dbf5", fontWeight: 600 },
  rowRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  rowProb: { fontWeight: 800, color: "#fff" },
  confDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
  },
  confText: { color: "#a191c4", fontSize: "11px", fontWeight: 700 },
  scoreRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  scoreValue: { fontWeight: 700, color: "#fff" },
  scoreProb: { color: "#22d3ee", fontWeight: 700 },
  footerNote: {
    color: "#6b5c8a",
    fontSize: "11px",
    textAlign: "center",
    marginTop: "16px",
  },
};
