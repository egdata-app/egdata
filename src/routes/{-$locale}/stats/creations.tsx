import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCreationsByMonth, CreationsByMonth } from "@/components/charts/creations/monthly";
import { getCreationsByYear, CreationsByYear } from "@/components/charts/creations/yearly";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/stats/creations")({
  component: RouteComponent,

  loader: async ({ context }) => {
    const { queryClient } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["creations-by-month"],
        queryFn: () => getCreationsByMonth().catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: ["creations-by-year"],
        queryFn: () => getCreationsByYear().catch(() => null),
      }),
    ]);
  },

  head: () => {
    return {
      meta: [
        {
          title: i18n.t("stats.creations.meta.title"),
        },
        {
          name: "description",
          content: i18n.t("stats.creations.meta.description"),
        },
      ],
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8 min-h-[80vh] relative">
      <Link to="/{-$locale}/stats/releases" className="absolute top-0 right-0 z-10">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("stats.creations.viewReleases")}
        </Button>
      </Link>

      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{t("stats.creations.heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("stats.creations.description")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.creations.monthlyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreationsByMonth />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.creations.yearlyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreationsByYear />
        </CardContent>
      </Card>
    </div>
  );
}
