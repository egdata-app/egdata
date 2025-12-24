const client_id = process.env.DISCORD_CLIENT_ID as string;
const client_secret = process.env.DISCORD_CLIENT_SECRET as string;

export const refreshToken = async (token: string) =>
  fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token,
    }),
  });
