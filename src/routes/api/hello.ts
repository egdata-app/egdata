import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/hello").methods({
  GET: async ({ request }) => {
    console.log("Request", request);
    return new Response("Hello World!");
  },
});
