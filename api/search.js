import https from "https";

function httpsGet(url, headers) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, body: "", error: "timeout" }); });
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { first_name = "", last_name = "" } = req.query;
  const BASE = "https://api.brixhub.to/api/v1";
  const KEY = process.env.BRIXHUB_KEY || "";

  // Header X-API-Key (confirmé par la doc)
  const headers = {
    "Accept": "application/json",
    "X-API-Key": KEY
  };

  // Paramètres en français : prenom + nom_famille (confirmé par ta capture)
  const p = `prenom=${encodeURIComponent(first_name)}&nom_famille=${encodeURIComponent(last_name)}`;

  // Chemin correct : /lookups/ (avec un S)
  const candidates = [
    `${BASE}/lookups/search?${p}`,
    `${BASE}/lookups/name?${p}`,
    `${BASE}/lookups/full?${p}`,
    `${BASE}/lookups?${p}`,
    `${BASE}/lookups/full_name?${p}`,
    `${BASE}/lookups/identity?${p}`,
  ];

  const logs = [];
  for (const url of candidates) {
    const r = await httpsGet(url, headers);
    let parsed = null;
    try { parsed = JSON.parse(r.body); } catch {}

    logs.push({
      url,
      status: r.status,
      preview: (r.body || "").slice(0, 300)
    });

    if (r.status === 200 && parsed) {
      return res.status(200).json({ ok: true, usedUrl: url, data: parsed, allAttempts: logs });
    }
  }

  return res.status(200).json({
    ok: false,
    message: "Aucun endpoint /lookups/ n'a répondu 200",
    allAttempts: logs
  });
}
