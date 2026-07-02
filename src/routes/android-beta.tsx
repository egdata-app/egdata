import { createFileRoute } from "@tanstack/react-router";
import { AndroidBetaForm } from "@/components/forms/android-beta";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/android-beta")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: i18n.t("misc.androidBeta.meta.title"),
      },
      {
        name: "description",
        content: i18n.t("misc.androidBeta.meta.description"),
      },
    ],
  }),
});

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-col items-center justify-start min-h-screen gap-6 px-4 py-10 w-full max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{t("misc.androidBeta.title")}</h1>
        <p className="text-muted-foreground text-lg">{t("misc.androidBeta.description")}</p>
      </div>

      <AndroidBetaForm />

      <div className="text-sm text-muted-foreground space-y-2 max-w-md">
        <h3 className="font-semibold">{t("misc.androidBeta.whatHappensNext")}</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>{t("misc.androidBeta.steps.signIn")}</li>
          <li>{t("misc.androidBeta.steps.added")}</li>
          <li>{t("misc.androidBeta.steps.download")}</li>
        </ol>
      </div>
    </main>
  );
}
