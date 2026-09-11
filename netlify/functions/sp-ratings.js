// netlify/functions/sp-ratings.js
// Proxies CFBD SP+ ratings API — keeps API key server-side in env vars
exports.handler = async () => {
  const key = process.env.CFBD_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "CFBD_API_KEY not configured" }) };
  }
  try {
    const res = await fetch(
      "https://api.collegefootballdata.com/ratings/sp?year=2026",
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) throw new Error(`CFBD responded ${res.status}`);
    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400", // CDN caches for 24h
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
