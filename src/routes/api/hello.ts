import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/hello")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        console.log("Request", request);
        return new Response("Hello World!");
      },
    },
  },
});
