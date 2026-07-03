import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/promotions/$id")({
  component: RouteComponent,

  beforeLoad: async ({ context: _context, params }) => {
    throw redirect({
      to: "/{-$locale}/tags/$id",
      params: {
        id: params.id,
      },
    });
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  return t("promotions.placeholder");
}
