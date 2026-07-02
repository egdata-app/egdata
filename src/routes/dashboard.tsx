import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/dashboard")({
  component: () => {
    const { t } = useTranslation();
    return <div>{t("dashboard.placeholder")}</div>;
  },

  beforeLoad: async ({ context }) => {
    if (context.session) {
      const id = context.session.user.email.split("@")[0];
      throw redirect({ href: `/profile/${id}` });
    }

    throw redirect({ to: "/" });
  },

  preload: true,
});
