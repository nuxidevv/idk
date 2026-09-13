import https from "https";

function httpsPost(url, headers, bodyObj) {
  return new Promise((resolve) => {
    const body = JSON.stringify(bodyObj);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });

    req.on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ status: 0, body: "", error: "timeout" }); });
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { first_name = "", last_name = "" } = req.query;
  const KEY = process.env.BRIXHUB_KEY || "";

  const headers = {
    "Accept": "application/json",
    "X-API-Key": KEY
  };

  // Body JSON avec les noms de paramètres FR
  const body = {
    prenom: first_name,
    nom_famille: last_name
  };

  const r = await httpsPost("https://api.brixhub.to/api/v1/search", headers, body);

  let parsed = null;
  try { parsed = JSON.parse(r.body); } catch { parsed = r.body; }

  return res.status(200).json({
    ok: r.status >= 200 && r.status < 300,
    status: r.status,
    error: r.error || null,
    data: parsed
  });
}
