export default async function handler(req, res) {
  // Headers CORS pour autoriser ton frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Récupère les paramètres first_name et last_name
  const { first_name, last_name } = req.query;

  // Appel côté serveur vers BrixHub (pas de CORS ici)
  const brixhubUrl = `https://api.brixhub.to/api/v1/search?first_name=${encodeURIComponent(first_name || "")}&last_name=${encodeURIComponent(last_name || "")}`;

  const response = await fetch(brixhubUrl, {
    headers: {
      "Authorization": `Bearer ${process.env.BRIXHUB_KEY}`,
      "Accept": "application/json"
    }
  });

  const body = await response.text();

  res.status(response.status)
     .setHeader("Content-Type", "application/json")
     .send(body);
}
