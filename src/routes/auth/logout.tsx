import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/auth/logout")({
  component: () => {
    const { t } = useTranslation();
    return <div>{t("auth.logout.placeholder")}</div>;
  },

  beforeLoad: async () => {
    if (import.meta.env.SSR) {
      const { deleteCookie } = await import("@/lib/start-server");
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
