import crypto from "crypto";

function signSession(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return data + "." + sig;
}

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("Code manquant");

  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const SECRET = process.env.SESSION_SECRET;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI
    })
  });

  if (!tokenRes.ok) return res.status(500).send("Échec échange token");
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!userRes.ok) return res.status(500).send("Échec récupération user");
  const user = await userRes.json();

  const guildRes = await fetch(`https://discord.com/api/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const guilds = guildRes.ok ? await guildRes.json() : [];
  const isMember = Array.isArray(guilds) && guilds.some(g => g.id === GUILD_ID);

  if (!isMember) {
    await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ access_token: accessToken })
    });
  }

  const session = signSession({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    guild: GUILD_ID,
    ts: Date.now()
  }, SECRET);

  res.setHeader("Set-Cookie", `seek_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`);
  res.redirect(302, "/");
}
