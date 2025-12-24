import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: () => <div>Hello /dashboard!</div>,

  beforeLoad: async ({ context }) => {
    if (context.session) {
      const id = context.session.user.email.split("@")[0];
      throw redirect({ href: `/profile/${id}` });
    }

    throw redirect({ to: "/" });
  },

  preload: true,
});
