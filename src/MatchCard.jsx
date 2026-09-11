import { useState, useEffect } from "react";
import TeamCrest from "./TeamCrest";
import { trackPrediction, getTrackedMarkets } from "./trackPrediction";

function confidenceColor(confidence) {
  switch (confidence) {
    case "VERY HIGH": return "#22e584";
    case "HIGH": return "#4ade80";
    case "MEDIUM": return "#fbbf24";
    case "LOW": return "#fb923c";
    default: return "#f5445c";
  }
}

const PILL_ACCENTS = ["#8b5cf6", "#fbbf24", "#ec4899", "#22d3ee", "#22e584", "#22e584"];

export default function MatchCard({ competition, homeTeam, awayTeam, homeCrest, awayCrest, kickoff, prediction, recommendedMarket, onSelect }) {
  const { matchResult, btts, overUnder, expectedGoals } = prediction;
  const [trackedMarkets, setTrackedMarkets] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  const matchInfo = { homeTeam, awayTeam, competition, kickoff };

  const pills = [
    { key: "home_win", label: "Home Win", value: matchResult.homeWin, icon: "🏠" },
    { key: "draw", label: "Draw", value: matchResult.draw, icon: "🤝" },
    { key: "away_win", label: "Away Win", value: matchResult.awayWin, icon: "✈️" },
    { key: "btts_yes", label: "BTTS", value: btts.yes, icon: "⚽" },
    { key: "over_1_5", label: "Over 1.5", value: overUnder.over15, icon: "📈" },
    { key: "over_2_5", label: "Over 2.5", value: overUnder.over25, icon: "📈" },
  ];

  useEffect(() => {
    getTrackedMarkets(matchInfo).then(setTrackedMarkets);
  }, [homeTeam, awayTeam, kickoff]);

  async function handleTrack(e, pill) {
    e.stopPropagation();
    if (trackedMarkets.includes(pill.key)) return;

    setTrackedMarkets((prev) => [...prev, pill.key]);

    const result = await trackPrediction(matchInfo, pill.key, pill.label, pill.value.probability);

    if (result.error && !result.duplicate) {
      setTrackedMarkets((prev) => prev.filter((k) => k !== pill.key));
    }
  }

  return (
    <div style={styles.card} onClick={() => onSelect({ competition, homeTeam, awayTeam, homeCrest, awayCrest, kickoff, prediction })}>
      <div style={styles.topRow}>
        {competition && <div style={styles.competitionTag}>{competition}</div>}
        {kickoff && (
          <div style={styles.kickoff}>
            {new Date(kickoff).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        )}
      </div>

      <div style={styles.header}>
        <div style={styles.teamBlock}>
          <TeamCrest src={homeCrest} name={homeTeam} size={26} />
          <span style={styles.team}>{homeTeam}</span>
        </div>
        <span style={styles.vs}>VS</span>
        <div style={{ ...styles.teamBlock, justifyContent: "flex-end" }}>
          <span style={{ ...styles.team, textAlign: "right" }}>{awayTeam}</span>
          <TeamCrest src={awayCrest} name={awayTeam} size={26} />
        </div>
      </div>

      <div style={styles.summaryLine}>
        xG {expectedGoals.home} – {expectedGoals.away} · BTTS {btts.yes.probability.toFixed(0)}% · O2.5 {overUnder.over25.probability.toFixed(0)}%
      </div>

      {recommendedMarket && (
        <div style={styles.recommended}>
          <span style={styles.recommendedLabel}>🔥 Model Lean</span>
          <span style={styles.recommendedMarket}>
            {recommendedMarket.icon} {recommendedMarket.key}
          </span>
          <span style={styles.recommendedProb}>{recommendedMarket.data.probability.toFixed(1)}%</span>
        </div>
      )}

      <div style={styles.grid}>
        {pills.map((p, i) => (
          <div key={i} style={{ ...styles.pill, borderTop: `2px solid ${PILL_ACCENTS[i]}` }}>
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

      <div style={styles.footerHint}>Tap for full analysis →</div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker((s) => !s);
        }}
        style={styles.trackToggleBtn}
      >
        📌 {showPicker ? "Hide markets" : "Track a pick"} {trackedMarkets.length > 0 && `(${trackedMarkets.length} tracked)`}
      </button>

      {showPicker && (
        <div style={styles.pickerPanel}>
          {pills.map((p, i) => {
            const isTracked = trackedMarkets.includes(p.key);
            return (
              <button
                key={i}
                onClick={(e) => handleTrack(e, p)}
                disabled={isTracked}
                style={{
                  ...styles.pickerItem,
                  ...(isTracked ? styles.pickerItemDone : {}),
                }}
              >
                <span>{p.icon} {p.label} · {p.value.probability}%</span>
                <span>{isTracked ? "✓" : "Track"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "18px",
    margin: "14px 0",
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
    cursor: "pointer",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  competitionTag: {
    background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
    color: "#fff",
    fontSize: "10px",
    fontWeight: 800,
    padding: "4px 10px",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  kickoff: {
    color: "#8b7aa8",
    fontSize: "11px",
    fontWeight: 600,
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  teamBlock: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  team: {
    fontSize: "15px",
    fontWeight: 800,
    lineHeight: 1.2,
  },
  vs: {
    color: "#ec4899",
    fontSize: "11px",
    fontWeight: 800,
  },
  summaryLine: {
    fontSize: "12px",
    color: "#a191c4",
    marginBottom: "12px",
  },
  recommended: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(90deg, rgba(139,92,246,0.18), rgba(236,72,153,0.18))",
    border: "1px solid rgba(236,72,153,0.4)",
    borderRadius: "12px",
    padding: "10px 12px",
    marginBottom: "14px",
    boxShadow: "0 0 20px rgba(236,72,153,0.12)",
  },
  recommendedLabel: {
    fontSize: "10px",
    color: "#e0c4ff",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 800,
  },
  recommendedMarket: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#fff",
  },
  recommendedProb: {
    fontSize: "16px",
    fontWeight: 900,
    color: "#22e584",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    marginBottom: "10px",
  },
  pill: {
    background: "rgba(255,255,255,0.03)",
    borderRadius: "10px",
    padding: "8px 10px",
  },
  pillTop: {
    fontSize: "10px",
    color: "#a191c4",
    marginBottom: "4px",
    whiteSpace: "nowrap",
  },
  pillBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pillValue: { fontSize: "16px", fontWeight: 900, color: "#fff" },
  pillDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  footerHint: {
    fontSize: "11px",
    color: "#6b5c8a",
    textAlign: "center",
  },
  trackToggleBtn: {
    width: "100%",
    marginTop: "12px",
    background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.4)",
    color: "#c9baE4",
    borderRadius: "10px",
    padding: "10px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  pickerPanel: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  pickerItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "10px 12px",
    color: "#fff",
    fontSize: "13px",
    cursor: "pointer",
  },
  pickerItemDone: {
    background: "rgba(34,229,132,0.1)",
    border: "1px solid rgba(34,229,132,0.4)",
    color: "#22e584",
    cursor: "default",
  },
};
