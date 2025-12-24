import { SectionsNav } from "@/components/app/offer-sections";
import { textPlatformIcons } from "@/components/app/platform-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/hooks/use-locale";
import { calculateSize } from "@/lib/calculate-size";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getHashType } from "@/lib/get-hash-type";
import { getImage } from "@/lib/get-image";
import { httpClient } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import type { SingleBuild } from "@/types/builds";
import type { SingleItem } from "@/types/single-item";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { BoxIcon, FilesIcon, OptionIcon } from "lucide-react";
import { DateTime } from "luxon";

export const Route = createFileRoute("/builds/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();
    return (
      <HydrationBoundary state={dehydratedState}>
        <BuildPage />
      </HydrationBoundary>
    );
  },
  loader: async ({ params, context }) => {
    const { queryClient } = context;
    const { id } = params;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["build", { id }],
        queryFn: () => httpClient.get<SingleBuild>(`/builds/${id}`),
      }),
      queryClient.prefetchQuery({
        queryKey: ["build-items", { id }],
        queryFn: () => httpClient.get<SingleItem[]>(`/builds/${id}/items`),
      }),
    ]);

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
  beforeLoad: async (ctx) => {
    const { params } = ctx;
    const subPath = ctx.location.pathname.toString().split(`/${params.id}/`)[1] as
      | string
      | undefined;

    if (!subPath) {
      throw redirect({
        to: `/builds/${params.id}/files`,
        replace: true,
        resetScroll: true,
      });
    }
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Build not found",
            description: "Build not found",
          },
        ],
      };
    }

    const build = getFetchedQuery<SingleBuild>(queryClient, ctx.loaderData?.dehydratedState, [
      "build",
      { id: params.id },
    ]);
    const items = getFetchedQuery<PaginatedResponse<SingleItem>>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      ["build-items", { id: params.id }],
    );

    if (!build) {
      return {
        meta: [
          {
            title: "Build not found",
            description: "Build not found",
          },
        ],
      };
    }

    const image = getImage(items?.data[0]?.keyImages ?? [], ["DieselGameBoxWide", "DieselGameBox"]);

    return {
      meta: [
        {
          title: `${items?.data[0]?.title} (${build.buildVersion}) | egdata.app`,
        },
        {
          name: "description",
          content: `${build.buildVersion} Build for ${items?.data[0]?.title} from the Epic Games Store.`,
        },
        {
          name: "og:title",
          content: `${items?.data[0]?.title} (${build.buildVersion}) | egdata.app`,
        },
        {
          name: "og:description",
          content: `${build.buildVersion} Build for ${items?.data[0]?.title} from the Epic Games Store.`,
        },
        {
          property: "twitter:title",
          content: `${items?.data[0]?.title} (${build.buildVersion}) | egdata.app`,
        },
        {
          property: "twitter:description",
          content: `${build.buildVersion} Build for ${items?.data[0]?.title} from the Epic Games Store.`,
        },
        {
          name: "og:image",
          content: image?.url ?? "https://cdn.egdata.app/placeholder-1080.webp",
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          name: "twitter:image",
          content: image?.url ?? "https://cdn.egdata.app/placeholder-1080.webp",
        },
      ],
    };
  },
});

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

function BuildPage() {
  const { id } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const { timezone } = useLocale();
  const subPath = useLocation().pathname.split(`/${id}/`)[1];
  const { data: items } = useQuery({
    queryKey: ["build-items", { id }],
    queryFn: () => httpClient.get<PaginatedResponse<SingleItem>>(`/builds/${id}/items`),
  });
  const { data: build } = useQuery({
    queryKey: ["build", { id }],
    queryFn: () => httpClient.get<SingleBuild>(`/builds/${id}`),
  });

  if (!build) {
    return <div>Build not found</div>;
  }

  return (
    <main className="flex flex-col items-start justify-start h-full gap-4 p-4 w-full">
      <div className="flex flex-col gap-4 mx-auto w-full">
        <div className="inline-flex items-center gap-2 justify-start w-full h-8">
          <span className="text-lg text-muted-foreground inline-flex items-center">Build</span>
          <strong className="text-lg font-medium">{id.toUpperCase()}</strong>
          <span className="text-lg text-muted-foreground inline-flex items-center">for</span>
          <strong className="text-lg font-medium">{items?.data[0].title}</strong>
          <span>{textPlatformIcons[build.labelName.split("-")[1]]}</span>
        </div>
        <div className="rounded-xl border border-gray-300/10 w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Build ID</TableHead>
                <TableHead className="text-left font-mono border-l-gray-300/10 border-l">
                  {id.toUpperCase()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Build Name</TableCell>
                <TableCell className="font-mono text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                  {build.buildVersion}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">App Name</TableCell>
                <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                  {build.appName}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Hash</TableCell>
                <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                  {build.hash}{" "}
                  <span className="text-xs text-gray-400">({getHashType(build.hash)})</span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Installed Size</TableCell>
                <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                  {calculateSize(build.installedSizeBytes)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Download Size</TableCell>
                <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                  {calculateSize(build.downloadSizeBytes)}{" "}
                  <span
                    className={cn(
                      "text-xs text-gray-400",
                      !build.downloadSizeBytes ? "opacity-0" : "opacity-100",
                    )}
                  >
                    ({(100 - (build.downloadSizeBytes / build.installedSizeBytes) * 100).toFixed(2)}
                    % compressed)
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Created At</TableCell>
                <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                  {DateTime.fromISO(build.createdAt)
                    .setZone(timezone || "UTC")
                    .setLocale("en-GB")
                    .toLocaleString({
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZoneName: "short",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Updated At</TableCell>
                <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                  {DateTime.fromISO(build.updatedAt)
                    .setZone(timezone || "UTC")
                    .setLocale("en-GB")
                    .toLocaleString({
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZoneName: "short",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="underline decoration-dotted decoration-gray-300/50 underline-offset-4 cursor-help">
                          Technologies
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm max-w-md">
                          We use the{" "}
                          <a
                            href="https://steamdb.info/tech/"
                            className="text-blue-700 font-semibold"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            SteamDB
                          </a>{" "}
                          technologies list to track the used engines and different technologies
                          from the game files.
                          <br />
                          <a
                            href="https://github.com/SteamDatabase/FileDetectionRuleSets"
                            className="text-blue-700 font-semibold"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Source
                          </a>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="border-l-gray-300/10 border-l">
                  <div className="grid grid-cols-3 gap-2">
                    {build.technologies
                      ?.filter((tech) => tech.section !== "Evidence")
                      .map((tech) => (
                        <span
                          key={`${tech.section}.${tech.technology}`}
                          className="inline-flex gap-1 items-center justify-start"
                        >
                          <span className="text-xs text-gray-300">
                            {tech.section} / {tech.technology}
                          </span>
                        </span>
                      ))}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-row justify-start items-start gap-1 w-full">
        <SectionsNav
          links={[
            {
              id: "files",
              label: (
                <span className="inline-flex items-center gap-2">
                  <FilesIcon className="size-3" />
                  <span>Files</span>
                </span>
              ),
              href: `/builds/${id}/files`,
            },
            {
              id: "items",
              label: (
                <span className="inline-flex items-center gap-2">
                  <BoxIcon className="size-3" />
                  <span>Items</span>
                </span>
              ),
              href: `/builds/${id}/items`,
            },
            {
              id: "install-options",
              label: (
                <span className="inline-flex items-center gap-2">
                  <OptionIcon className="size-3" />
                  <span>Install Options</span>
                </span>
              ),
              href: `/builds/${id}/install-options`,
            },
          ]}
          activeSection={subPath ?? "files"}
          onSectionChange={(location) => {
            navigate({
              to: `/builds/${id}/${location}`,
              replace: false,
              resetScroll: false,
            });
          }}
          orientation="vertical"
        />
        <div className="w-full h-full">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
