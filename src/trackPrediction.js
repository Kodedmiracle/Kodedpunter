import { supabase } from "./supabaseClient";

function buildMatchId(match) {
  return `${match.homeTeam}-${match.awayTeam}-${match.kickoff}`;
}

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function trackPrediction(match, marketKey, marketLabel, probability) {
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const matchId = buildMatchId(match);

  const { data: existing, error: checkError } = await supabase
    .from("predictions")
    .select("id")
    .eq("match_id", matchId)
    .eq("market", marketKey)
    .eq("user_id", userId)
    .maybeSingle();

  if (checkError) return { error: checkError };
  if (existing) return { duplicate: true };

  const { data, error } = await supabase.from("predictions").insert({
    match_id: matchId,
    home_team: match.homeTeam,
    away_team: match.awayTeam,
    competition: match.competition,
    kickoff: match.kickoff,
    market: marketKey,
    predicted_value: marketLabel,
    confidence: probability,
    user_id: userId,
  });

  return { data, error };
}

export async function getTrackedMarkets(match) {
  const userId = await getUserId();
  if (!userId) return [];

  const matchId = buildMatchId(match);
  const { data, error } = await supabase
    .from("predictions")
    .select("market")
    .eq("match_id", matchId)
    .eq("user_id", userId);

  if (error) return [];
  return data.map((d) => d.market);
}
