import https from "https";

function httpsGet(url, headers) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, body: "", error: "timeout" }); });
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { first_name = "", last_name = "" } = req.query;
  const fullName = `${first_name} ${last_name}`.trim();
  const BASE = "https://api.brixhub.to/api/v1";
  const KEY = process.env.BRIXHUB_KEY || "";

  // Header correct : X-API-Key (vu dans la doc OpenAPI)
  const headers = {
    "Accept": "application/json",
    "X-API-Key": KEY
  };

  const q = `first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`;
  const qn = `name=${encodeURIComponent(fullName)}`;
  const qq = `q=${encodeURIComponent(fullName)}`;

  const candidates = [
    // /lookup en priorité (le vrai endpoint selon la doc)
    `${BASE}/lookup/name?${q}`,
    `${BASE}/lookup/full?${qn}`,
    `${BASE}/lookup/full_name?${qn}`,
    `${BASE}/lookup?${q}`,
    `${BASE}/lookup?${qn}`,
    `${BASE}/lookup?${qq}`,
    // Puis /search et variantes
    `${BASE}/search?${q}`,
    `${BASE}/search?${qn}`,
    `${BASE}/search?${qq}`,
    `${BASE}/person?${q}`,
    `${BASE}/person/search?${q}`,
    `${BASE}/people?${q}`,
    `${BASE}/name?${q}`,
    `${BASE}/identity?${q}`,
    `${BASE}/records?${q}`,
  ];

  const logs = [];
  for (const url of candidates) {
    const r = await httpsGet(url, headers);
    let parsed = null;
    try { parsed = JSON.parse(r.body); } catch {}

    logs.push({
      url,
      status: r.status,
      preview: (r.body || "").slice(0, 300),
      error: r.error || null
    });

    // Succès RÉEL : status 2xx ET ce n'est pas la doc
    if (
      r.status >= 200 && r.status < 300 &&
      parsed &&
      !url.includes("/docs") &&
      !url.includes("/openapi") &&
      !url.includes("/swagger")
    ) {
      return res.status(200).json({
        ok: true,
        usedUrl: url,
        data: parsed,
        allAttempts: logs
      });
    }
  }

  return res.status(200).json({
    ok: false,
    message: "Aucun endpoint valide trouvé (la doc a été ignorée)",
    allAttempts: logs
  });
}
