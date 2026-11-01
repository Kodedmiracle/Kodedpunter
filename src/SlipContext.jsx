import { createContext, useContext, useState, useCallback } from "react";

const SlipContext = createContext(null);

export function SlipProvider({ children }) {
  const [legs, setLegs] = useState([]);

  const legId = (leg) =>
    `\( {leg.homeTeam}| \){leg.awayTeam}|\( {leg.leanKey}| \){leg.kickoff || ""}`;

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

  const clearSlip = useCallback(() => setLegs([]), []);

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
