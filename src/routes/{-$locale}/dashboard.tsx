import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/dashboard")({
  component: () => {
    const { t } = useTranslation();
    return <div>{t("dashboard.placeholder")}</div>;
  },

  beforeLoad: async ({ context }) => {
    if (context.session) {
      const id = context.session.user.email.split("@")[0];
      throw redirect({ href: `/profile/${id}` });
    }

    throw redirect({ to: "/{-$locale}" });
  },

  preload: true,
});
