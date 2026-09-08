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
        {homeTeam} vs {awayTeam}
      </h2>
      {kickoff && (
        <p style={styles.kickoff}>{new Date(kickoff).toLocaleString()}</p>
      )}

      <div style={styles.xgBox}>
        Expected Goals: {expectedGoals.home} - {expectedGoals.away}
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
            <span>{s.score}</span>
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
      <span>{label}</span>
      <span style={styles.rowRight}>
        {data.probability}% — {data.confidence}
      </span>
    </div>
  );
}

const styles = {
  container: {
    background: "#0d0d0d",
    minHeight: "100vh",
    padding: "20px",
    color: "#fff",
    fontFamily: "sans-serif",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "14px",
    marginBottom: "16px",
    padding: 0,
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
  title: { fontSize: "20px", marginBottom: "4px" },
  kickoff: { color: "#888", fontSize: "13px", marginBottom: "12px" },
  xgBox: {
    background: "#1a1a1a",
    borderRadius: "8px",
    padding: "10px",
    fontSize: "14px",
    marginBottom: "16px",
  },
  explanation: {
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#ccc",
    marginBottom: "20px",
  },
  section: {
    background: "#1a1a1a",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "12px",
  },
  sectionTitle: {
    fontSize: "13px",
    textTransform: "uppercase",
    color: "#888",
    marginBottom: "8px",
    letterSpacing: "0.5px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    padding: "6px 0",
    borderBottom: "1px solid #2a2a2a",
  },
  rowRight: { color: "#aaa" },
  scoreRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    padding: "6px 0",
    borderBottom: "1px solid #2a2a2a",
  },
  scoreProb: { color: "#aaa" },
  footerNote: {
    color: "#666",
    fontSize: "11px",
    textAlign: "center",
    marginTop: "16px",
  },
};
