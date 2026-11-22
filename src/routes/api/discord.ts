import { createFileRoute } from "@tanstack/react-router";

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|semrush|ahrefs|mj12bot|bytespider|gptbot|claudebot|facebookexternalhit|discordbot|whatsapp|telegrambot/i;

function resolveDiscordInviteUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (value.startsWith("https://") || value.startsWith("http://")) {
    return value;
  }

  return `https://discord.gg/${value.replace(/^\/+/, "")}`;
}

export const Route = createFileRoute("/api/discord")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userAgent = request.headers.get("user-agent") ?? "";
        if (BOT_UA_PATTERN.test(userAgent)) {
          return new Response("Forbidden", {
            status: 403,
            headers: {
              "X-Robots-Tag": "noindex, nofollow",
              "Cache-Control": "no-store",
            },
          });
        }

        const inviteUrl = resolveDiscordInviteUrl(process.env.DISCORD_INVITE_URL);
        if (!inviteUrl) {
          return new Response("Discord invite is not configured", {
            status: 404,
            headers: {
              "X-Robots-Tag": "noindex, nofollow",
              "Cache-Control": "no-store",
            },
          });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: inviteUrl,
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
