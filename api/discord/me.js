import crypto from "crypto";

function verifySession(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (sig !== expected) return null;
  try { return JSON.parse(Buffer.from(data, "base64url").toString()); }
  catch { return null; }
}

export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/seek_session=([^;]+)/);
  if (!match) return res.status(200).json({ logged: false });

  const session = verifySession(match[1], process.env.SESSION_SECRET);
  if (!session) return res.status(200).json({ logged: false });

  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  const memberRes = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${session.id}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }
  });

  const isMember = memberRes.ok;

  return res.status(200).json({
    logged: true,
    isMember,
    user: {
      id: session.id,
      username: session.username,
      avatar: session.avatar
    }
  });
}
