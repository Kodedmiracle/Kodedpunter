export default function FilterBar({
  searchTerm,
  onSearchChange,
  competitionFilter,
  onCompetitionChange,
  competitions,
  sortBy,
  onSortChange,
  dateFilter,
  onDateFilterChange,
}) {
  return (
    <div style={styles.container}>
      <input
        type="text"
        placeholder="Search team or competition..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        style={styles.input}
      />

      <div style={styles.row}>
        <button
          type="button"
          onClick={() => onDateFilterChange("TODAY")}
          style={dateFilter === "TODAY" ? styles.toggleActive : styles.toggle}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onDateFilterChange("ALL")}
          style={dateFilter === "ALL" ? styles.toggleActive : styles.toggle}
        >
          All Upcoming
        </button>
      </div>

      <div style={styles.row}>
        <select
          value={competitionFilter}
          onChange={(e) => onCompetitionChange(e.target.value)}
          style={styles.select}
        >
          <option value="ALL">All Competitions</option>
          {competitions.map((comp) => (
            <option key={comp} value={comp}>
              {comp}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          style={styles.select}
        >
          <option value="default">Default Order</option>
          <option value="homeWin">Highest Home Win %</option>
          <option value="btts">Highest BTTS %</option>
          <option value="over25">Highest Over 2.5 %</option>
        </select>
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginBottom: "16px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#fff",
    fontSize: "14px",
    marginBottom: "8px",
    boxSizing: "border-box",
  },
  row: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
  },
  toggle: {
    flex: 1,
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#aaa",
    fontSize: "13px",
    cursor: "pointer",
  },
  toggleActive: {
    flex: 1,
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #a855f7",
    background: "linear-gradient(90deg, #a855f7, #ec4899)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  select: {
    flex: 1,
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#fff",
    fontSize: "13px",
  },
};
