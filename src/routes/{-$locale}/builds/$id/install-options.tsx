import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSize } from "@/lib/calculate-size";
import { httpClient } from "@/lib/http-client";
import type { BuildInstallOptions } from "@/types/builds";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/builds/$id/install-options")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <InstallOptions />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["builds", "install-options", { id }],
      queryFn: async () =>
        httpClient.get<BuildInstallOptions>(`/builds/${id}/install-options`).catch(() => null),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

function InstallOptions() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as { dehydratedState: DehydratedState; id: string };
  const { data: installOptions } = useQuery({
    queryKey: ["builds", "install-options", { id }],
    queryFn: async () =>
      httpClient.get<BuildInstallOptions>(`/builds/${id}/install-options`).catch(() => null),
  });

  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <p className="text-lg font-semibold">{t("builds.installOptions.title")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {installOptions &&
          Object.entries(installOptions).map(([key, { files, size }]) => (
            <Card key={key} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{key}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateSize(size)}</div>
                <p className="text-xs text-muted-foreground">
                  {files} {t("builds.installOptions.file", { count: files })}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>
    </main>
  );
}
