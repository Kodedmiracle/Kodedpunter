export default function ScoreHeatmap({ matrix, homeTeam, awayTeam }) {
  if (!matrix || matrix.length === 0) return null;

  const max = Math.max(...matrix.flat());

  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Score matrix</h3>
      <p style={styles.hint}>
        Home goals down the left, away goals along the top. Brighter = more likely.
      </p>

      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.corner} />
              {matrix[0].map((_, a) => (
                <th key={a} style={styles.head}>
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, h) => (
              <tr key={h}>
                <th style={styles.head}>{h}</th>
                {row.map((pct, a) => {
                  const t = max > 0 ? pct / max : 0;
                  const bg = `rgba(139, 92, 246, ${0.12 + t * 0.75})`;
                  const isTop = pct === max;
                  return (
                    <td
                      key={a}
                      style={{
                        ...styles.cell,
                        background: bg,
                        outline: isTop ? "1px solid #22e584" : "none",
                        color: t > 0.55 ? "#fff" : "#d6c8f0",
                      }}
                      title={`${h}-${a}: ${pct}%`}
                    >
                      {pct.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={styles.caption}>
        Rows = {homeTeam} goals · Columns = {awayTeam} goals · numbers are %
      </p>
    </div>
  );
}

const styles = {
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
    marginBottom: "6px",
    letterSpacing: "0.6px",
    fontWeight: 800,
  },
  hint: {
    color: "#8b7aa8",
    fontSize: "12px",
    margin: "0 0 12px",
    lineHeight: 1.4,
  },
  scroll: {
    overflowX: "auto",
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: "3px",
    width: "100%",
    fontSize: "10px",
    fontVariantNumeric: "tabular-nums",
  },
  corner: { width: 18 },
  head: {
    color: "#a191c4",
    fontWeight: 700,
    fontSize: "10px",
    textAlign: "center",
    padding: "2px",
  },
  cell: {
    textAlign: "center",
    borderRadius: "6px",
    padding: "7px 2px",
    fontWeight: 700,
    minWidth: "32px",
  },
  caption: {
    color: "#6b5c8a",
    fontSize: "11px",
    margin: "10px 0 0",
  },
};
