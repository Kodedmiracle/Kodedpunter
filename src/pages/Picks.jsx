import { useEffect, useState, useMemo } from "react";
import MatchCard from "../MatchCard";
import MatchDetail from "../MatchDetail";
import { getRecommendedMarket } from "../bestPicks.js";

const MARKET_FILTERS = [
  { value: "ALL", label: "All Markets" },
  { value: "btts", label: "BTTS" },
  { value: "over25", label: "Over/Under" },
  { value: "homeWin", label: "Match Result" },
];

function Picks() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [marketFilter, setMarketFilter] = useState("ALL");

  useEffect(() => {
    fetch("/predictions.json")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load predictions");
        return res.json();
      })
      .then((data) => {
        setMatches(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredMatches = useMemo(() => {
    let result = [...matches];

    if (marketFilter === "btts") {
      result = result.filter((m) => m.prediction.btts.yes.probability >= 55);
      result.sort(
        (a, b) => b.prediction.btts.yes.probability - a.prediction.btts.yes.probability
      );
    } else if (marketFilter === "over25") {
      result = result.filter((m) => m.prediction.overUnder.over25.probability >= 55);
      result.sort(
        (a, b) =>
          b.prediction.overUnder.over25.probability -
          a.prediction.overUnder.over25.probability
      );
    } else if (marketFilter === "homeWin") {
      result = result.filter((m) => m.prediction.matchResult.homeWin.probability >= 40);
      result.sort(
        (a, b) =>
          b.prediction.matchResult.homeWin.probability -
          a.prediction.matchResult.homeWin.probability
      );
    }

    return result;
  }, [matches, marketFilter]);

  if (selectedMatch) {
    return (
      <MatchDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />
    );
  }

  return (
    <div className="page">
      <h1>Picks</h1>
      <p>All model predictions, filterable by market.</p>

      <div style={styles.filterRow}>
        {MARKET_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setMarketFilter(f.value)}
            style={{
              ...styles.filterBtn,
              ...(marketFilter === f.value ? styles.filterBtnActive : {}),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p style={styles.status}>Loading predictions...</p>}
      {error && <p style={styles.status}>Error: {error}</p>}
      {!loading && !error && filteredMatches.length === 0 && (
        <p style={styles.status}>No matches for this filter.</p>
      )}

      {filteredMatches.map((match, i) => (
        <MatchCard
          key={i}
          competition={match.competition}
          homeTeam={match.homeTeam}
          matchId={match.matchId}
          awayTeam={match.awayTeam}
          homeCrest={match.homeCrest}
          awayCrest={match.awayCrest}
          kickoff={match.kickoff}
          prediction={match.prediction}
          recommendedMarket={getRecommendedMarket(match, matches)}
          onSelect={setSelectedMatch}
        />
      ))}
    </div>
  );
}

const styles = {
  filterRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  filterBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#a191c4",
    borderRadius: "999px",
    padding: "6px 14px",
    fontSize: "13px",
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "linear-gradient(145deg, #8b5cf6, #ec4899)",
    color: "#fff",
    border: "none",
  },
  status: {
    color: "#a191c4",
    fontSize: "14px",
  },
};

export default Picks;
