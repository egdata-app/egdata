import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/logout")({
  component: () => <div>Hello /auth/logout!</div>,

  beforeLoad: async () => {
    if (import.meta.env.SSR) {
      const { deleteCookie } = await import("@tanstack/react-start/server");
      deleteCookie("EGDATA_AUTH", {
        secure: true,
        path: "/",
        domain: import.meta.env.PROD ? ".egdata.app" : "localhost",
      });
    }

    throw redirect({
      to: "/",
    });
  },
});
