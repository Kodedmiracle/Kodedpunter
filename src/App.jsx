import { useEffect, useState, useMemo } from "react";
import MatchCard from "./MatchCard";
import MatchDetail from "./MatchDetail";
import BestPicks from "./BestPicks";
import FilterBar from "./FilterBar";
import { extractBestPicks, getRecommendedMarket } from "./bestPicks.js";
import "./App.css";

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("default");

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

  const competitions = useMemo(() => {
    const set = new Set(matches.map((m) => m.competition).filter(Boolean));
    return [...set];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let result = [...matches];

    if (competitionFilter !== "ALL") {
      result = result.filter((m) => m.competition === competitionFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(term) ||
          m.awayTeam.toLowerCase().includes(term) ||
          (m.competition && m.competition.toLowerCase().includes(term))
      );
    }

    if (sortBy === "homeWin") {
      result.sort(
        (a, b) =>
          b.prediction.matchResult.homeWin.probability -
          a.prediction.matchResult.homeWin.probability
      );
    } else if (sortBy === "btts") {
      result.sort(
        (a, b) => b.prediction.btts.yes.probability - a.prediction.btts.yes.probability
      );
    } else if (sortBy === "over25") {
      result.sort(
        (a, b) =>
          b.prediction.overUnder.over25.probability -
          a.prediction.overUnder.over25.probability
      );
    }

    return result;
  }, [matches, competitionFilter, searchTerm, sortBy]);

  if (selectedMatch) {
    return (
      <MatchDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />
    );
  }

  const bestPicks = extractBestPicks(matches, 10);

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>⚽ Kodedpunter</h1>
      <p style={styles.subtitle}>Statistical match predictions</p>
      <p style={styles.disclaimer}>
        ⚠️ Champions League predictions are provisional until the 2026–27
        league phase kicks off — teams show as evenly matched until real
        season data exists.
      </p>

      {loading && <p style={styles.status}>Loading predictions...</p>}
      {error && <p style={styles.status}>Error: {error}</p>}

      {!loading && !error && matches.length === 0 && (
        <p style={styles.status}>No predictions available yet.</p>
      )}

      {!loading && !error && matches.length > 0 && (
        <>
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            competitionFilter={competitionFilter}
            onCompetitionChange={setCompetitionFilter}
            competitions={competitions}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <BestPicks picks={bestPicks} />

          {filteredMatches.length === 0 && (
            <p style={styles.status}>No matches found.</p>
          )}
        </>
      )}

      {filteredMatches.map((match, i) => (
        <MatchCard
          key={i}
          competition={match.competition}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          kickoff={match.kickoff}
          prediction={match.prediction}
          recommendedMarket={getRecommendedMarket(match, matches)}
          onSelect={setSelectedMatch}
        />
      ))}

      {!loading && !error && matches.length > 0 && (
        <footer style={styles.footer}>
          <p style={styles.footerTitle}>How this works</p>
          <p style={styles.footerText}>
            Predictions come from a Poisson goal model built on each team's
            season goals scored/conceded, weighted recent form, and home
            advantage. Markets like BTTS and Over/Under are derived directly
            from the resulting expected-goals distribution — not separately
            guessed. Teams with fewer than 10 games played this season are
            pulled toward the league average to avoid overreacting to small
            samples. These are statistical estimates, not guarantees.
          </p>
        </footer>
      )}
    </div>
  );
}

const styles = {
  app: {
    background: "#0d0d0d",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "sans-serif",
  },
  title: {
    color: "#fff",
    fontSize: "24px",
    marginBottom: "4px",
  },
  subtitle: {
    color: "#888",
    fontSize: "13px",
    marginBottom: "8px",
  },
  disclaimer: {
    color: "#e0a030",
    fontSize: "12px",
    marginBottom: "20px",
    maxWidth: "500px",
  },
  status: {
    color: "#888",
    fontSize: "14px",
  },
  footer: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #24242e",
  },
  footerTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#aaa",
    marginBottom: "8px",
  },
  footerText: {
    fontSize: "12px",
    color: "#777",
    lineHeight: 1.6,
  },
};

export default App;
