import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/promotions/$id")({
  component: RouteComponent,

  beforeLoad: async ({ context: _context, params }) => {
    throw redirect({
      to: `/tags/${params.id}`,
    });
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  return t("promotions.placeholder");
}
