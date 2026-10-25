require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_TOKEN = process.env.FOOTBALL_API_KEY;
const BASE_URL = "https://api.football-data.org/v4";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMatch(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}`, {
    headers: { "X-Auth-Token": API_TOKEN },
  });
  if (!res.ok) throw new Error(`Match fetch failed: ${res.status}`);
  return res.json();
}

function gradeMarket(marketKey, homeGoals, awayGoals) {
  const totalGoals = homeGoals + awayGoals;
  const bothScored = homeGoals > 0 && awayGoals > 0;

  switch (marketKey) {
    case "home_win":
      return homeGoals > awayGoals;
    case "draw":
      return homeGoals === awayGoals;
    case "away_win":
      return awayGoals > homeGoals;
    case "btts_yes":
      return bothScored;
    case "over_1_5":
      return totalGoals > 1.5;
    case "over_2_5":
      return totalGoals > 2.5;
    case "btts_no":
      return !bothScored;
    case "under_3_5":
      return totalGoals < 3.5;
    case "home_or_draw":
      return homeGoals >= awayGoals;
    case "draw_or_away":
      return awayGoals >= homeGoals;
    default:
      return null; // unknown market, skip
  }
}

async function settleTable(table) {
  console.log(`--- Settling pending ${table} ---`);

  let q = supabase
    .from(table)
    .select("*")
    .is("correct", null)
    .not("match_id", "is", null);
  if (table === "pick_log") q = q.lt("kickoff", new Date().toISOString());
  const { data: pending, error } = await q;

  if (error) {
    console.error("Failed to fetch pending predictions:", error.message);
    return;
  }

  console.log(`Found ${pending.length} pending picks`);

  // Group by match_id so we only fetch each match once
  const byMatch = {};
  for (const row of pending) {
    if (!byMatch[row.match_id]) byMatch[row.match_id] = [];
    byMatch[row.match_id].push(row);
  }

  const matchIds = Object.keys(byMatch);
  console.log(`Covering ${matchIds.length} unique matches`);

  for (const matchId of matchIds) {
    // Only proceed for numeric football-data.org IDs — skip old string-based ones
    if (!/^\d+$/.test(matchId)) {
      console.log(`Skipping non-numeric match_id: ${matchId}`);
      continue;
    }

    try {
      const matchData = await fetchMatch(matchId);
      await sleep(6500); // respect football-data.org free tier rate limit

      if (matchData.status !== "FINISHED") {
        console.log(`Match ${matchId} not finished yet (${matchData.status})`);
        continue;
      }

      const homeGoals = matchData.score.fullTime.home;
      const awayGoals = matchData.score.fullTime.away;

      console.log(`Match ${matchId} finished: ${homeGoals}-${awayGoals}`);

      for (const row of byMatch[matchId]) {
        const correct = gradeMarket(row.market, homeGoals, awayGoals);
        if (correct === null) {
          console.log(`  Skipping unknown market: ${row.market}`);
          continue;
        }

        const { error: updateError } = await supabase
          .from(table)
          .update({
            correct,
            actual_result: `${homeGoals}-${awayGoals}`,
          })
          .eq("id", row.id);

        if (updateError) {
          console.error(`  Failed to update row ${row.id}:`, updateError.message);
        } else {
          console.log(`  ${row.market}: ${correct ? "CORRECT" : "INCORRECT"}`);
        }
      }
    } catch (err) {
      console.log(`Error processing match ${matchId}: ${err.message}`);
    }
  }

  console.log("--- Done ---");
}

async function main() {
  await settleTable("predictions");
  await settleTable("pick_log");
}

main();
