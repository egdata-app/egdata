import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DonateKeyForm } from "@/components/forms/donate-key";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/donate-key")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <h1 className="text-2xl font-bold">{t("misc.donateKey.title")}</h1>
      <p className="mb-4">{t("misc.donateKey.body")}</p>
      <DonateKeyForm />
    </main>
  );
}
