// netlify/functions/ai-analysis.js
// Generates a short AI analysis of a game using the Signal Scanner's own framework
// context (lean, implied prob, which of the 4 layers are active) plus whatever
// injury data was loaded for the matchup. Requires ANTHROPIC_API_KEY to be set as
// a Netlify environment variable — this calls the real Anthropic API and will use
// your own API credits per request, which is why this is a manual button in the
// UI rather than something that fires automatically per card.
//
// RATE LIMITING: this function is publicly reachable (it's a static-site Netlify
// function with no auth layer) and spends real Anthropic API credits per call, so
// it needs its own guard rather than relying on the UI button to gate usage — a
// caller can hit the endpoint directly. We cap requests per source IP using
// Netlify Blobs (persists across invocations, no extra infra to run).

const { getStore } = require("@netlify/blobs");

const RATE_LIMIT_MAX = 20;             // requests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // per rolling hour, per IP

async function checkRateLimit(ip) {
  const store = getStore("rate-limits");
  const blobKey = `ai-analysis:${ip}`;
  const now = Date.now();
  let record = null;
  try {
    record = await store.get(blobKey, { type: "json" });
  } catch {
    record = null; // treat any read failure as "no record yet" rather than blocking
  }
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    record = { windowStart: now, count: 0 };
  }
  record.count += 1;
  try {
    await store.setJSON(blobKey, record);
  } catch {
    // If Blobs is unavailable for some reason, fail open rather than 500ing
    // every request — losing the rate limit is safer than losing the feature.
    return true;
  }
  return record.count <= RATE_LIMIT_MAX;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured in Netlify environment variables" }) };
  }

  const clientIp = event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"] || "unknown";
  const allowed = await checkRateLimit(clientIp);
  if (!allowed) {
    return {
      statusCode: 429,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Rate limit exceeded (${RATE_LIMIT_MAX} analyses/hour). Try again later.` }),
    };
  }

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const { away, home, lean, optimal, impliedProb, signalScore, passedTags, injuries } = payload;

  const injurySummary = injuries
    ? Object.entries(injuries).map(([team, list]) =>
        `${team}: ${list.length ? list.map(p => `${p.name} (${p.position}) - ${p.status}`).join("; ") : "no designations reported"}`
      ).join("\n")
    : "Not loaded.";

  const prompt = `You are a sports betting research assistant helping a bettor read a matchup at a glance. Be concise, concrete, and calibrated — do not overstate confidence, and do not tell the person what to bet. Use the data given; do not invent injuries, players, or stats not provided.

Matchup: ${away} @ ${home}
Model lean: ${lean}
Optimal bet per model: ${optimal?.label || "n/a"}
Pinnacle implied win probability on lean: ${impliedProb != null ? (impliedProb * 100).toFixed(1) + "%" : "n/a"}
Signal strength: ${signalScore}/4
Active framework signals: ${passedTags && passedTags.length ? passedTags.join(", ") : "none"}

Injury report:
${injurySummary}

In 3-5 short sentences: summarize what the injury picture means for this specific lean (if anything is missing/unclear, say so plainly), note any way the injury news cuts against or reinforces the model's signals above, and flag one thing worth watching before kickoff. Do not repeat the raw data back verbatim — synthesize it.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errBody.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ analysis: text || "No analysis returned." }),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
