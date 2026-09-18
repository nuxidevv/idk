import https from "https";

const BLOCKED_TARGETS = [
  { prenom: "leo",    nom: "roman" },
  { prenom: "lucile", nom: "roman" },
  { prenom: "jimmy",  nom: "roman" },
  { prenom: "tom",    nom: "roman" }
];

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlocked(fullName) {
  const norm = normalizeName(fullName);
  if (!norm) return false;
  const tokens = norm.split(" ").filter(t => t.length > 0);
  return BLOCKED_TARGETS.some(t => {
    const hasPrenomComplet = tokens.includes(t.prenom);
    const hasNomComplet = tokens.includes(t.nom);
    if (hasPrenomComplet && hasNomComplet) return true;
    const hasPrenomTronque = tokens.some(tok => tok.length >= 2 && t.prenom.startsWith(tok));
    if (hasPrenomTronque && hasNomComplet) return true;
    const hasNomTronque = tokens.some(tok => tok.length >= 3 && t.nom.startsWith(tok));
    if (hasPrenomComplet && hasNomTronque) return true;
    return false;
  });
}

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

function emptyResponse(a, b) {
  return {
    data: [],
    message: "ok",
    meta: {
      total: 0,
      page: 1,
      per_page: 10,
      query: { prenom: a, nom_famille: b }
    }
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const {
    first_name = "",
    last_name = "",
    email = "",
    telephone = ""
  } = req.query;

  const isEmailSearch = String(email).trim().length > 0;
  const isPhoneSearch = String(telephone).trim().length > 0;

  if (!isEmailSearch && !isPhoneSearch) {
    if (isBlocked(`${first_name} ${last_name}`)) {
      return res.status(200).json(emptyResponse(first_name, last_name));
    }
  }

  const KEY = process.env.BRIXHUB_KEY || "";

  const headers = {
    "Accept": "application/json",
    "X-API-Key": KEY
  };

  let payload = {};

  if (isEmailSearch) {
    payload = { email: String(email).trim() };
  } else if (isPhoneSearch) {
    payload = { telephone: String(telephone).trim() };
  } else {
    payload = {
      prenom: first_name,
      nom_famille: last_name
    };
  }

  const r = await httpsPost("https://api.brixhub.to/api/v1/search", headers, payload);

  let parsed = null;
  try { parsed = JSON.parse(r.body); } catch { parsed = r.body; }

  return res.status(200).json({
    ok: r.status >= 200 && r.status < 300,
    status: r.status,
    error: r.error || null,
    data: parsed
  });
}
