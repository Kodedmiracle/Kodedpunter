import { createContext, useContext, useState, useCallback, useEffect } from "react";

const SlipContext = createContext(null);

function legId(leg) {
  return [
    leg.matchId || "",
    leg.homeTeam || "",
    leg.awayTeam || "",
    leg.leanKey || "",
    leg.kickoff || "",
  ].join("|");
}

export function SlipProvider({ children }) {
  const [legs, setLegs] = useState(() => {
    try {
      const raw = sessionStorage.getItem("koded_slip");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("koded_slip", JSON.stringify(legs));
    } catch {
      /* ignore */
    }
  }, [legs]);

  const isSelected = useCallback(
    (leg) => legs.some((l) => legId(l) === legId(leg)),
    [legs]
  );

  const toggleLeg = useCallback((leg) => {
    setLegs((prev) => {
      const id = legId(leg);
      if (prev.some((l) => legId(l) === id)) {
        return prev.filter((l) => legId(l) !== id);
      }
      return [...prev, leg];
    });
  }, []);

  const clearSlip = useCallback(() => {
    setLegs([]);
    try {
      sessionStorage.removeItem("koded_slip");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SlipContext.Provider value={{ legs, toggleLeg, isSelected, clearSlip }}>
      {children}
    </SlipContext.Provider>
  );
}

export function useSlip() {
  const ctx = useContext(SlipContext);
  if (!ctx) throw new Error("useSlip must be used inside SlipProvider");
  return ctx;
}
