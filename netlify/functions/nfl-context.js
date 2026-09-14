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

const TEAM_IDS = {
  ARI:22, ATL:1, BAL:33, BUF:2, CAR:29, CHI:3, CIN:4, CLE:5, DAL:6, DEN:7,
  DET:8, GB:9, HOU:34, IND:11, JAX:30, KC:12, LV:13, LAC:24, LAR:14, MIA:15,
  MIN:16, NE:17, NO:18, NYG:19, NYJ:20, PHI:21, PIT:23, SF:25, SEA:26, TB:27,
  TEN:10, WSH:28,
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN request failed (${res.status}) for ${url}`);
  return res.json();
}

function toYYYYMMDD(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function extractInjuriesFromEvent(event, awayId, homeId) {
  // ESPN scoreboard/summary events sometimes carry injuries at event.competitions[0].injuries,
  // each entry shaped like { team: { id }, injuries: [ { athlete, status, details } ] }.
  const comp = event?.competitions?.[0];
  const blocks = comp?.injuries || event?.injuries || [];
  const out = {};
  for (const block of blocks) {
    const teamId = String(block?.team?.id || "");
    const abbr = teamId === String(awayId) ? "AWAY" : teamId === String(homeId) ? "HOME" : null;
    if (!abbr) continue;
    out[abbr] = (block.injuries || []).map(inj => ({
      name: inj?.athlete?.displayName || inj?.athlete?.shortName || "Unknown",
      position: inj?.athlete?.position?.abbreviation || inj?.position?.abbreviation || "",
      status: inj?.status || inj?.type?.description || "Unknown",
      detail: inj?.details?.detail || inj?.shortComment || "",
    }));
  }
  return out;
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
    // Search a small date window around kickoff (commence_time may be UTC and
    // shift a calendar day from ESPN's local scoreboard date).
    const baseDate = commence ? new Date(commence) : new Date();
    const candidates = [-1, 0, 1].map(offset => {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() + offset);
      return toYYYYMMDD(d);
    });

    let matchedEvent = null;
    for (const dateStr of candidates) {
      const sb = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${dateStr}`);
      const found = (sb.events || []).find(ev => {
        const ids = (ev?.competitions?.[0]?.competitors || []).map(c => String(c?.team?.id));
        return ids.includes(String(awayId)) && ids.includes(String(homeId));
      });
      if (found) { matchedEvent = found; break; }
    }

    if (!matchedEvent) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ injuries: {}, note: "No matching ESPN event found yet for this matchup — try again closer to game week." }),
      };
    }

    let injuries = extractInjuriesFromEvent(matchedEvent, awayId, homeId);

    // Fallback: fetch the full summary endpoint, which more reliably includes injuries
    if (Object.keys(injuries).length === 0 && matchedEvent.id) {
      try {
        const summary = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${matchedEvent.id}`);
        const blocks = summary?.injuries || [];
        const out = {};
        for (const block of blocks) {
          const teamId = String(block?.team?.id || "");
          const abbr = teamId === String(awayId) ? "AWAY" : teamId === String(homeId) ? "HOME" : null;
          if (!abbr) continue;
          out[abbr] = (block.injuries || []).map(inj => ({
            name: inj?.athlete?.displayName || "Unknown",
            position: inj?.athlete?.position?.abbreviation || "",
            status: inj?.status || "Unknown",
            detail: inj?.details?.detail || "",
          }));
        }
        injuries = out;
      } catch { /* keep empty injuries, note below explains */ }
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
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
