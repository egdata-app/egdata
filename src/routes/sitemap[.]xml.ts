import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => Response.redirect("https://api.egdata.app/sitemap.xml", 308),
    },
  },
});
