import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/discord-linked")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[85vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            {t("misc.discordLinked.title")}
          </h2>
          <p className="mt-2 text-sm text-foreground/80">{t("misc.discordLinked.body")}</p>
        </div>
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t("misc.discordLinked.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
