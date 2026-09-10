import { useEffect, useState, useMemo } from "react";
import MatchCard from "../MatchCard";
import MatchDetail from "../MatchDetail";
import { getRecommendedMarket } from "../bestPicks.js";

function Leagues() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);

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

  const leagueGroups = useMemo(() => {
    const groups = {};
    matches.forEach((m) => {
      if (!m.competition) return;
      if (!groups[m.competition]) groups[m.competition] = [];
      groups[m.competition].push(m);
    });
    return groups;
  }, [matches]);

  if (selectedMatch) {
    return (
      <MatchDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />
    );
  }

  if (selectedLeague) {
    const leagueMatches = leagueGroups[selectedLeague] || [];
    return (
      <div className="page">
        <button style={styles.backBtn} onClick={() => setSelectedLeague(null)}>
          ← All Leagues
        </button>
        <h1>{selectedLeague}</h1>
        <p>{leagueMatches.length} match{leagueMatches.length !== 1 ? "es" : ""}</p>

        {leagueMatches.map((match, i) => (
          <MatchCard
            key={i}
            competition={match.competition}
            homeTeam={match.homeTeam}
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

  return (
    <div className="page">
      <h1>Leagues</h1>
      <p>Browse predictions by competition.</p>

      {loading && <p style={styles.status}>Loading predictions...</p>}
      {error && <p style={styles.status}>Error: {error}</p>}

      {!loading && !error &&
        Object.entries(leagueGroups).map(([league, leagueMatches]) => (
          <button
            key={league}
            style={styles.leagueCard}
            onClick={() => setSelectedLeague(league)}
          >
            <span style={styles.leagueName}>{league}</span>
            <span style={styles.leagueCount}>
              {leagueMatches.length} match{leagueMatches.length !== 1 ? "es" : ""} →
            </span>
          </button>
        ))}
    </div>
  );
}

const styles = {
  status: {
    color: "#a191c4",
    fontSize: "14px",
  },
  leagueCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "18px 16px",
    marginBottom: "12px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    textAlign: "left",
    cursor: "pointer",
  },
  leagueName: {
    color: "#fff",
  },
  leagueCount: {
    color: "#a191c4",
    fontSize: "13px",
    fontWeight: 500,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#ec4899",
    fontSize: "14px",
    marginBottom: "16px",
    padding: 0,
    cursor: "pointer",
  },
};

export default Leagues;
