export default function TeamCrest({ src, name, size = 28 }) {
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  if (!src) {
    return (
      <div style={{ ...styles.fallback, width: size, height: size, fontSize: size * 0.4 }}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} crest`}
      width={size}
      height={size}
      style={styles.image}
      onError={(e) => {
        // If the crest URL fails to load, swap to the initials fallback
        // rather than leaving a broken image icon.
        e.target.style.display = "none";
        e.target.nextSibling.style.display = "flex";
      }}
    />
  );
}

const styles = {
  image: {
    objectFit: "contain",
    display: "inline-block",
    verticalAlign: "middle",
  },
  fallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "linear-gradient(145deg, #8b5cf6, #ec4899)",
    color: "#fff",
    fontWeight: 800,
  },
};
