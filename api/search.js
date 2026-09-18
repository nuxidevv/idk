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

async function tryBrixhub(payload) {
  const KEY = process.env.BRIXHUB_KEY || "";
  const headers = {
    "Accept": "application/json",
    "X-API-Key": KEY
  };
  const r = await httpsPost("https://api.brixhub.to/api/v1/search", headers, payload);
  let parsed = null;
  try { parsed = JSON.parse(r.body); } catch { parsed = r.body; }
  return { ok: r.status >= 200 && r.status < 300, status: r.status, error: r.error || null, data: parsed };
}

function countResults(data) {
  if (!data || typeof data !== "object") return 0;
  for (const k of ["results","data","items","records","hits","matches","persons","people"]) {
    if (Array.isArray(data[k])) return data[k].length;
  }
  if (Array.isArray(data)) return data.length;
  if (data.meta && typeof data.meta.total === "number") return data.meta.total;
  return 0;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { first_name = "", last_name = "" } = req.query;

  const a = String(first_name).trim();
  const b = String(last_name).trim();

  const fullQuery = [a, b].filter(Boolean).join(" ").trim();

  if (fullQuery.length < 2) {
    return res.status(200).json(emptyResponse(a, b));
  }

  if (isBlocked(fullQuery)) {
    return res.status(200).json(emptyResponse(a, b));
  }

  const hasA = a.length > 0;
  const hasB = b.length > 0;

  let firstResult = null;
  let secondResult = null;

  if (hasA && hasB) {
    firstResult = await tryBrixhub({ prenom: a, nom_famille: b });

    if (firstResult.ok && countResults(firstResult.data) > 0) {
      return res.status(200).json({
        ok: firstResult.ok,
        status: firstResult.status,
        error: firstResult.error || null,
        data: firstResult.data
      });
    }

    secondResult = await tryBrixhub({ prenom: b, nom_famille: a });

    if (secondResult.ok && countResults(secondResult.data) > 0) {
      return res.status(200).json({
        ok: secondResult.ok,
        status: secondResult.status,
        error: secondResult.error || null,
        data: secondResult.data
      });
    }

    const fallback = secondResult || firstResult;
    return res.status(200).json({
      ok: fallback.ok,
      status: fallback.status,
      error: fallback.error || null,
      data: fallback.data
    });
  }

  if (hasA) {
    firstResult = await tryBrixhub({ prenom: a });
    return res.status(200).json({
      ok: firstResult.ok,
      status: firstResult.status,
      error: firstResult.error || null,
      data: firstResult.data
    });
  }

  if (hasB) {
    firstResult = await tryBrixhub({ prenom: b });
    return res.status(200).json({
      ok: firstResult.ok,
      status: firstResult.status,
      error: firstResult.error || null,
      data: firstResult.data
    });
  }

  return res.status(200).json(emptyResponse(a, b));
}
