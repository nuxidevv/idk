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
  const headers = {
    "Accept": "application/json",
    "Authorization": `Bearer ${KEY}`,
    "X-API-Key": KEY
  };

  const candidates = [
    `${BASE}/search?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/search?name=${encodeURIComponent(fullName)}`,
    `${BASE}/search?q=${encodeURIComponent(fullName)}`,
    `${BASE}/person?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/person/search?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/people?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/name?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/lookup?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/identity?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/records?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}`,
    `${BASE}/docs`,
    `${BASE}/openapi.json`,
    `${BASE}/swagger.json`
  ];

  const logs = [];
  for (const url of candidates) {
    const r = await httpsGet(url, headers);
    logs.push({
      url,
      status: r.status,
      preview: (r.body || "").slice(0, 400),
      error: r.error || null
    });

    if (r.status >= 200 && r.status < 300) {
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch {}
      if (parsed) {
        return res.status(200).json({
          ok: true,
          usedUrl: url,
          data: parsed,
          allAttempts: logs
        });
      }
    }
  }

  return res.status(200).json({
    ok: false,
    message: "Aucun endpoint n'a répondu OK",
    allAttempts: logs
  });
}
