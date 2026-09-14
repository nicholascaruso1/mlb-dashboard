// netlify/functions/nfl-context.js
// Proxies ESPN's public (unauthenticated) NFL endpoints to surface injuries/inactives
// for a given matchup. No API key required — these are ESPN's public site APIs.
//
// NOTE ON SCOPE: ESPN does not expose pregame "snap share %" — that stat only exists
// after a game is played. What we CAN get pregame is the official injury report
// (Out / Doubtful / Questionable) plus position, which is what actually drives
// in-game role changes. True snap-share trend (e.g. "RB2 has taken 40%+ of snaps
// over last 3 games") would need a historical box-score data source — flagged as a
// follow-up in the backlog, not built here.
//
// PERFORMANCE NOTE: an earlier version resolved the NFL week number by fetching
// ESPN's plain /scoreboard endpoint to read its season calendar, then fetching the
// target week's scoreboard, then (usually) falling back to the full game /summary
// endpoint — three sequential multi-hundred-KB+ ESPN payloads in one request,
// which blew past Netlify's function timeout and surfaced as a bare 502 with no
// JSON body (so the frontend's error handling never even saw a message). Fixed by
// hardcoding the week-1/week-2 boundary (confirmed against ESPN's own 2026 season
// calendar) so week resolution needs zero network calls, and by adding a
// per-fetch timeout via AbortController so a slow ESPN response fails fast with a
// real error message instead of a silent platform-level 502.

const TEAM_IDS = {
  ARI:22, ATL:1, BAL:33, BUF:2, CAR:29, CHI:3, CIN:4, CLE:5, DAL:6, DEN:7,
  DET:8, GB:9, HOU:34, IND:11, JAX:30, KC:12, LV:13, LAC:24, LAR:14, MIA:15,
  MIN:16, NE:17, NO:18, NYG:19, NYJ:20, PHI:21, PIT:23, SF:25, SEA:26, TB:27,
  TEN:10, WSH:28,
};

// 2026 season boundaries, sourced directly from ESPN's own scoreboard calendar
// (leagues[0].calendar) at build time. Week 1 runs long (covers the Thu-Mon
// season-opening slate plus any late-Monday games); every week after that is a
// clean 7-day block starting from Week 2's start. Re-verify against ESPN's
// calendar if this ever drifts (rare — only on schedule flex/format changes).
const WEEK2_START = Date.UTC(2026, 8, 16, 7, 0, 0); // 2026-09-16T07:00Z
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SEASON_START = Date.UTC(2026, 7, 6, 7, 0, 0); // 2026-08-06T07:00Z (incl. preseason)

function resolveWeekNumber(commenceTime) {
  const target = commenceTime ? new Date(commenceTime).getTime() : Date.now();
  if (isNaN(target) || target < SEASON_START) return null;
  if (target < WEEK2_START) return 1;
  return 2 + Math.floor((target - WEEK2_START) / WEEK_MS);
}

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN request failed (${res.status})`);
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("ESPN request timed out");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  const { away, home, commence } = event.queryStringParameters || {};
  if (!away || !home) {
    return { statusCode: 400, body: JSON.stringify({ error: "away and home team abbreviations required" }) };
  }
  const awayId = TEAM_IDS[away.toUpperCase()];
  const homeId = TEAM_IDS[home.toUpperCase()];
  if (!awayId || !homeId) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unrecognized team abbreviation: ${!awayId ? away : home}` }) };
  }

  try {
    const weekNumber = resolveWeekNumber(commence);
    if (!weekNumber) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ injuries: {}, note: "Couldn't resolve a regular-season week for this kickoff time (preseason or off-season)." }),
      };
    }

    const sb = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${weekNumber}`);
    const matchedEvent = (sb.events || []).find(ev => {
      const ids = (ev?.competitions?.[0]?.competitors || []).map(c => String(c?.team?.id));
      return ids.includes(String(awayId)) && ids.includes(String(homeId));
    });

    if (!matchedEvent) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ injuries: {}, note: `No matching ESPN event found in Week ${weekNumber} for this matchup.` }),
      };
    }

    // Go straight to the summary endpoint — ESPN's scoreboard events never carry
    // inline injuries in practice, so checking there first was pure wasted latency.
    let injuries = {};
    try {
      const summary = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${matchedEvent.id}`);
      const blocks = summary?.injuries || [];
      for (const block of blocks) {
        const teamId = String(block?.team?.id || "");
        const abbr = teamId === String(awayId) ? "AWAY" : teamId === String(homeId) ? "HOME" : null;
        if (!abbr) continue;
        injuries[abbr] = (block.injuries || []).map(inj => ({
          name: inj?.athlete?.displayName || "Unknown",
          position: inj?.athlete?.position?.abbreviation || "",
          status: inj?.status || "Unknown",
          detail: inj?.details?.detail || "",
        }));
      }
    } catch (e) {
      // Surface the real reason instead of silently returning empty — a timeout
      // here is meaningfully different from "no report published yet."
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ injuries: {}, note: `Found the game, but the ESPN game-summary lookup failed (${e.message}). Try again in a moment.` }),
      };
    }

    // Re-key AWAY/HOME onto the actual abbreviations the frontend asked with
    const keyed = {
      [away.toUpperCase()]: injuries.AWAY || [],
      [home.toUpperCase()]: injuries.HOME || [],
    };

    const hasAny = keyed[away.toUpperCase()].length > 0 || keyed[home.toUpperCase()].length > 0;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
      body: JSON.stringify({
        injuries: keyed,
        note: hasAny
          ? "Official injury report — final inactives are confirmed by both teams ~90 minutes before kickoff."
          : "No injury designations posted yet, or the report hasn't been published for this week. Check back closer to kickoff.",
      }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ injuries: {}, note: `Lookup failed: ${e.message}` }),
    };
  }
};
