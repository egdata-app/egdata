import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getCreationsByMonth, CreationsByMonth } from "@/components/charts/creations/monthly";
import { getCreationsByYear, CreationsByYear } from "@/components/charts/creations/yearly";

export const Route = createFileRoute("/stats/creations")({
  component: RouteComponent,

  loader: async ({ context }) => {
    const { queryClient } = context;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["creations-by-month"],
        queryFn: getCreationsByMonth,
      }),
      queryClient.prefetchQuery({
        queryKey: ["creations-by-year"],
        queryFn: getCreationsByYear,
      }),
    ]);
  },

  head: () => {
    return {
      meta: [
        {
          title: "Creations stats - egdata.app",
        },
        {
          name: "description",
          content: "Monthly and yearly cadence of new creations landing on the Epic Games Store.",
        },
      ],
    };
  },
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-8 min-h-[80vh] relative">
      <Link to="/stats/releases" className="absolute top-0 right-0 z-10">
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          View Releases
        </Button>
      </Link>

      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Epic Games Store creation stats</h2>
        <p className="text-sm text-gray-500">
          Monthly and yearly cadence of new creations landing on the store.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Monthly creations</CardTitle>
        </CardHeader>
        <CardContent>
          <CreationsByMonth />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yearly creations</CardTitle>
        </CardHeader>
        <CardContent>
          <CreationsByYear />
        </CardContent>
      </Card>
    </div>
  );
}
