import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import { dehydrate, type DehydratedState, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/getImage";
import { getPlatformsArray, textPlatformIcons } from "@/components/app/platform-icons";
import { Link } from "@tanstack/react-router";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SectionsNav } from "@/components/app/offer-sections";
import { generateItemMeta } from "@/lib/generate-item-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getQueryClient } from "@/lib/client";
import { useLocale } from "@/hooks/use-locale";
import { DateTime } from "luxon";

export const Route = createFileRoute("/items/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <ItemPage />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["item", { id }],
      queryFn: () => httpClient.get<SingleItem>(`/items/${id}`),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Item not found",
            description: "Item not found",
          },
        ],
      };
    }

    const item = getFetchedQuery<SingleItem>(queryClient, ctx.loaderData?.dehydratedState, [
      "item",
      { id: params.id },
    ]);

    if (!item) {
      return {
        meta: [
          {
            title: "item not found",
            description: "item not found",
          },
        ],
      };
    }

    return {
      meta: generateItemMeta(item),
    };
  },
});

function ItemPage() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  const { timezone } = useLocale();
  const subPath = useLocation().pathname.split(`/${id}/`)[1];
  const { data: item } = useQuery({
    queryKey: ["item", { id }],
    queryFn: () => httpClient.get<SingleItem>(`/items/${id}`),
  });

  if (!item) {
    return null;
  }

  return (
    <div className="flex flex-col items-center w-full min-h-[75vh] px-5 md:px-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <Badge>Item</Badge>
          </div>
          <div className="rounded-xl border border-gray-300/10 mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Item ID</TableHead>
                  <TableHead className="border-l-gray-300/10 border-l">{item.id}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Namespace</TableCell>
                  <TableCell
                    className={
                      "text-left font-mono border-l-gray-300/10 border-l underline decoration-dotted decoration-slate-600 underline-offset-4"
                    }
                  >
                    <Link to="/sandboxes/$id/items" params={{ id: item.namespace }}>
                      {internalNamespaces.includes(item.namespace) ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>{item.namespace}</TooltipTrigger>
                            <TooltipContent>
                              <p>Epic Games internal namespace</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        item.namespace
                      )}
                    </Link>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Developer</TableCell>
                  <TableCell className="border-l-gray-300/10 border-l">{item.developer}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Entitlement Type</TableCell>
                  <TableCell className="border-l-gray-300/10 border-l">
                    {item.entitlementType}
                  </TableCell>
                </TableRow>
                {item.entitlementName &&
                  item.entitlementName !== item.id &&
                  item.entitlementName !== item.title && (
                    <TableRow>
                      <TableCell className="font-medium">Entitlement Name</TableCell>
                      <TableCell className="border-l-gray-300/10 border-l">
                        {item.entitlementName}
                      </TableCell>
                    </TableRow>
                  )}
                <TableRow>
                  <TableCell className="font-medium">Status</TableCell>
                  <TableCell className="border-l-gray-300/10 border-l">{item.status}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Creation Date</TableCell>
                  <TableCell className="border-l-gray-300/10 border-l">
                    {DateTime.fromISO(item.creationDate)
                      .setZone(timezone || "UTC")
                      .setLocale("en-GB")
                      .toLocaleString({
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        timeZoneName: "short",
                      })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Last Modified</TableCell>
                  <TableCell className="border-l-gray-300/10 border-l">
                    {new Date(item.lastModifiedDate).toLocaleString("en-UK", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      timeZone: timezone,
                      timeZoneName: "short",
                    })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Platforms</TableCell>
                  <TableCell className="border-l-gray-300/10 border-l inline-flex items-center justify-start gap-1">
                    {getPlatformsArray(item.releaseInfo)
                      .filter((platform) => textPlatformIcons[platform])
                      .map((platform) => (
                        <span key={platform}>{textPlatformIcons[platform]}</span>
                      ))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex flex-col items-start justify-center gap-4">
          <Image
            src={
              getImage(item.keyImages, ["DieselGameBoxWide", "DieselGameBox"])?.url ??
              "/placeholder.webp"
            }
            alt={item.title}
            width={1920}
            height={1080}
            className="rounded-lg"
          />
          <p className="text-sm px-1">{item.description}</p>
        </div>
      </div>
      <hr className="w-full border-t border-gray-300/10 my-4" />

      <div className="flex flex-row items-start justify-start h-full gap-4 w-full min-h-[75vh]">
        <aside>
          <SectionsNav
            links={[
              {
                id: "",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>Item</span>
                  </span>
                ),
                href: `/items/${id}`,
              },
              {
                id: "assets",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>Assets</span>
                  </span>
                ),
                href: `/items/${id}/assets`,
              },
              {
                id: "images",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>Images</span>
                  </span>
                ),
                href: `/items/${id}/images`,
              },
              {
                id: "builds",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>Builds</span>
                  </span>
                ),
                href: `/items/${id}/builds`,
              },
              {
                id: "changelog",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>Changelog</span>
                  </span>
                ),
                href: `/items/${id}/changelog`,
              },
            ]}
            activeSection={subPath ?? ""}
            onSectionChange={(location) => {
              navigate({
                to: `/items/${id}/${location}`,
                replace: false,
                resetScroll: false,
              });
            }}
            orientation="vertical"
          />
        </aside>
        <Outlet />
      </div>
    </div>
  );
}
