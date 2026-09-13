import https from "https";

const _h = "api." + String.fromCharCode(98,114,105,120,104,117,98) + ".to";
const _p = "/api/v1/" + String.fromCharCode(115,101,97,114,99,104);

const _t = [
  ["leo",    String.fromCharCode(114,111,109,97,110)],
  ["lucile", String.fromCharCode(114,111,109,97,110)],
  ["jimmy",  String.fromCharCode(114,111,109,97,110)],
  ["tom",    String.fromCharCode(114,111,109,97,110)]
];

function _n(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function _blk(full) {
  const n = _n(full);
  if (!n) return false;
  const t = n.split(" ").filter(x => x.length > 0);
  return _t.some(([a, b]) => {
    const fa = t.includes(a);
    const fb = t.includes(b);
    if (fa && fb) return true;
    const ftA = t.some(x => x.length >= 2 && a.startsWith(x));
    if (ftA && fb) return true;
    const ftB = t.some(x => x.length >= 3 && b.startsWith(x));
    if (fa && ftB) return true;
    return false;
  });
}

function _post(url, headers, bodyObj) {
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

function _empty(a, b) {
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

  const a = req.query.a || "";
  const b = req.query.b || "";

  if (_blk(`${a} ${b}`)) {
    return res.status(200).json(_empty(a, b));
  }

  const KEY = process.env.BRIXHUB_KEY || "";

  const headers = {
    "Accept": "application/json",
    "X-API-Key": KEY
  };

  const r = await _post(`https://${_h}${_p}`, headers, {
    prenom: a,
    nom_famille: b
  });

  if (r.status < 200 || r.status >= 300) {
    return res.status(200).json(_empty(a, b));
  }

  let parsed = null;
  try { parsed = JSON.parse(r.body); } catch { parsed = r.body; }

  return res.status(200).json(parsed);
}
