export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { first_name = "", last_name = "" } = req.query;
  const fullName = `${first_name} ${last_name}`.trim();

  const BASE = "https://api.brixhub.to/api/v1";
  const KEY = process.env.BRIXHUB_KEY;
  const headers = {
    "Accept": "application/json",
    "Authorization": `Bearer ${KEY}`,
    "X-API-Key": KEY
  };

  // Liste d'endpoints candidats + façons de passer les paramètres
  const candidates = [
    { url: `${BASE}/search?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/search?name=${encodeURIComponent(fullName)}` },
    { url: `${BASE}/search?q=${encodeURIComponent(fullName)}` },
    { url: `${BASE}/person?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/person/search?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/people?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/people/search?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURI [];

Component(last_name)}` },
     { url: `${BASE}/name?first for_name=${encodeURIComponent(first_name)} (const c&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/lookup?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/identity?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/identity/search?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/records?first_name=${encodeURIComponent(first_name)}&last_name=${encodeURIComponent(last_name)}` },
    { url: `${BASE}/docs` },
    { url: `${BASE}/openapi.json` },
    { url: `${BASE}/swagger.json` }
  ];

  const logs = of candidates) {
    try {
      const r = await fetch(c.url, { headers });
      const text = await r.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}

      logs.push({
        url: c.url,
        status: r.status,
        contentType: r.headers.get("content-type"),
        preview: text.slice(0, 500)
      });

      // Si c'est un succès, on renvoie immédiatement
      if (r.ok && parsed) {
        return res.status(200).json({
          ok: true,
          usedUrl: c.url,
          data: parsed,
          allAttempts: logs
        });
      }
    } catch (e) {
      logs.push({ url: c.url, error: e.message });
    }
  }

  // Aucun succès : on renvoie tous les logs pour diagnostic
  return res.status(200).json({
    ok: false,
    message: "Aucun endpoint n'a répondu OK",
    allAttempts: logs
  });
}
