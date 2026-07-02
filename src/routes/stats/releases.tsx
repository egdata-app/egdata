import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getReleasesByMonth, ReleasesByMonth } from "@/components/charts/releases/monthly";
import { getReleasesByYear, ReleasesByYear } from "@/components/charts/releases/yearly";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/stats/releases")({
  component: RouteComponent,

  loader: async ({ context }) => {
    const { queryClient } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["releases-by-month"],
        queryFn: () => getReleasesByMonth().catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: ["releases-by-year"],
        queryFn: () => getReleasesByYear().catch(() => null),
      }),
    ]);
  },

  head: () => {
    return {
      meta: [
        {
          title: i18n.t("stats.releases.meta.title"),
        },
        {
          name: "description",
          content: i18n.t("stats.releases.meta.description"),
        },
      ],
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8 min-h-[80vh] relative">
      <Link to="/stats/creations" className="absolute top-0 right-0 z-10">
        <Button variant="outline" size="sm">
          {t("stats.releases.viewCreations")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>

      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{t("stats.releases.heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("stats.releases.description")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.releases.monthlyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReleasesByMonth />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.releases.yearlyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReleasesByYear />
        </CardContent>
      </Card>
    </div>
  );
}
