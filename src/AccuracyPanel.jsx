import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const MARKET_NAMES = {
  home_win: "Home Win",
  draw: "Draw",
  away_win: "Away Win",
  btts_yes: "BTTS Yes",
  btts_no: "BTTS No",
  over_1_5: "Over 1.5",
  over_2_5: "Over 2.5",
  under_3_5: "Under 3.5",
  home_or_draw: "Home or Draw",
  draw_or_away: "Draw or Away",
};

const CONF_ORDER = ["VERY HIGH", "HIGH"];

function rate(rows) {
  const total = rows.length;
  const wins = rows.filter((r) => r.correct).length;
  return { total, wins, pct: total ? (wins / total) * 100 : 0 };
}

function groupBy(rows, key) {
  const out = {};
  rows.forEach((r) => {
    const k = r[key];
    if (!out[k]) out[k] = [];
    out[k].push(r);
  });
  return out;
}

function Line({ label, stats }) {
  return (
    <div style={styles.line}>
      <div style={styles.lineTop}>
        <span style={styles.lineLabel}>{label}</span>
        <span style={styles.lineValue}>
          {stats.pct.toFixed(1)}% · {stats.wins}/{stats.total}
        </span>
      </div>
      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${Math.min(100, stats.pct)}%` }} />
      </div>
    </div>
  );
}

export default function AccuracyPanel() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("pick_log")
      .select("market,confidence,correct")
      .not("correct", "is", null)
      .limit(5000)
      .then(({ data, error }) => {
        if (alive) setRows(error ? [] : data || []);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) return null;

  const overall = rate(rows);
  const byConf = groupBy(rows, "confidence");
  const byMarket = groupBy(rows, "market");
  const confKeys = [
    ...CONF_ORDER.filter((k) => byConf[k]),
    ...Object.keys(byConf).filter((k) => !CONF_ORDER.includes(k)),
  ];
  const marketKeys = Object.keys(byMarket).sort(
    (a, b) => byMarket[b].length - byMarket[a].length
  );

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>📊 Model accuracy</h2>

      {rows.length === 0 ? (
        <p style={styles.note}>
          Every Best Pick is logged automatically. Results appear here once the
          matches finish and get graded, usually within a day.
        </p>
      ) : (
        <>
          <p style={styles.note}>
            {overall.total} graded Best Picks so far
            {overall.total < 30 ? " — small sample, treat these numbers as rough." : "."}
          </p>

          <Line label="All picks" stats={overall} />

          <p style={styles.sub}>By confidence</p>
          {confKeys.map((k) => (
            <Line key={k} label={k} stats={rate(byConf[k])} />
          ))}

          <p style={styles.sub}>By market</p>
          {marketKeys.map((k) => (
            <Line key={k} label={MARKET_NAMES[k] || k} stats={rate(byMarket[k])} />
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "linear-gradient(160deg, #1a0f33, #120a22)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "16px",
    color: "#fff",
  },
  title: { fontSize: "18px", fontWeight: 800, margin: "0 0 8px" },
  note: { fontSize: "13px", color: "#a191c4", margin: "0 0 12px", lineHeight: 1.5 },
  sub: { fontSize: "12px", color: "#a191c4", margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" },
  line: { marginBottom: "10px" },
  lineTop: { display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" },
  lineLabel: { fontWeight: 600 },
  lineValue: { color: "#c4b5fd" },
  barTrack: { height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" },
  barFill: { height: "100%", background: "linear-gradient(90deg, #8b5cf6, #ec4899)" },
};
