// netlify/functions/macro-rest.js
// Real situational-rest data to back the MACRO tag for NFL and NCAAF, replacing
// the old placeholder that just re-read Pinnacle implied probability at a lower
// threshold than MARKET (see App.jsx's tags.MACRO / explainSignals for that
// history — this closes the audit finding that MACRO wasn't independent signal).
//
// NFL: ESPN's public, unauthenticated team-schedule endpoint. Duplicates the
// TEAM_IDS map from nfl-context.js — same caveat as that file: if App.jsx's NFL
// abbreviations ever change, update both maps.
//
// NCAAF: CollegeFootballData's /games endpoint, same CFBD_API_KEY already
// configured for SP+ ratings (see sp-ratings.js). The caller must send the
// CFBD-style team name — App.jsx's toCFBDName() converts its displayName()
// output to that before calling, since CFBD's `team` query param expects its
// own naming convention, not ours.
//
// Definitions used here (first-cut thresholds, not empirically tuned — flag
// for calibration once the bet log has enough resolved CLV data to check them
// against, same spirit as the STEAM-threshold caveat elsewhere in this app):
//   restDays  = days between the team's most recent prior game and `asOf`
//   shortWeek = restDays <= 4.5 (e.g. a Thursday game following a Sunday game)
//   byeReturn = restDays >= 11 (coming off a bye week)

const NFL_TEAM_IDS = {
  ARI:22, ATL:1, BAL:33, BUF:2, CAR:29, CHI:3, CIN:4, CLE:5, DAL:6, DEN:7,
  DET:8, GB:9, HOU:34, IND:11, JAX:30, KC:12, LV:13, LAC:24, LAR:14, MIA:15,
  MIN:16, NE:17, NO:18, NYG:19, NYJ:20, PHI:21, PIT:23, SF:25, SEA:26, TB:27,
  TEN:10, WSH:28,
};

async function fetchJson(url, opts = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`request failed (${res.status})`);
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("request timed out");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function classify(restDaysRaw) {
  const restDays = Math.round(restDaysRaw * 10) / 10;
  return { restDays, shortWeek: restDays <= 4.5, byeReturn: restDays >= 11 };
}

async function nflRest(team, asOfMs) {
  const id = NFL_TEAM_IDS[team.toUpperCase()];
  if (!id) throw new Error(`Unrecognized NFL team abbreviation: ${team}`);
  const sched = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/schedule?season=2026`);
  const events = sched?.events || [];
  const past = events
    .filter(e => e?.date && new Date(e.date).getTime() < asOfMs)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (!past.length) return { restDays: null, note: "No prior game found this season (likely a season opener)." };
  const lastMs = new Date(past[0].date).getTime();
  return { ...classify((asOfMs - lastMs) / 86400000), lastGameDate: past[0].date };
}

async function cfbRest(team, asOfMs, key) {
  if (!key) throw new Error("CFBD_API_KEY not configured");
  const games = await fetchJson(
    `https://api.collegefootballdata.com/games?year=2026&team=${encodeURIComponent(team)}`,
    { headers: { Authorization: `Bearer ${key}` } }
  );
  const past = (games || [])
    .filter(g => g?.start_date && g?.completed && new Date(g.start_date).getTime() < asOfMs)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  if (!past.length) return { restDays: null, note: "No prior completed game found this season (likely a season opener)." };
  const lastMs = new Date(past[0].start_date).getTime();
  return { ...classify((asOfMs - lastMs) / 86400000), lastGameDate: past[0].start_date };
}

exports.handler = async (event) => {
  const { sport, team, asOf } = event.queryStringParameters || {};
  const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  if (!sport || !team || !asOf) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "sport, team, and asOf are required" }) };
  }
  const asOfMs = new Date(asOf).getTime();
  if (isNaN(asOfMs)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "asOf must be a valid ISO date" }) };
  }
  try {
    let result;
    if (sport.toLowerCase() === "nfl") {
      result = await nflRest(team, asOfMs);
    } else if (sport.toLowerCase() === "cfb") {
      result = await cfbRest(team, asOfMs, process.env.CFBD_API_KEY);
    } else {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Unsupported sport: ${sport} (only nfl/cfb implemented)` }) };
    }
    return {
      statusCode: 200,
      headers: { ...cors, "Cache-Control": "public, max-age=3600" },
      body: JSON.stringify(result),
    };
  } catch (e) {
    // Return 200 with restDays:null rather than a hard error — a rest-data
    // lookup failure for one team shouldn't break the whole card's analysis,
    // it should just fall back to MACRO's neutral-pass default.
    return { statusCode: 200, headers: cors, body: JSON.stringify({ restDays: null, note: `Lookup failed: ${e.message}` }) };
  }
};
