import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
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
import { Link } from "@/components/app/localized-link";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SectionsNav } from "@/components/app/offer-sections";
import { generateItemMeta } from "@/lib/generate-item-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getQueryClient } from "@/lib/client";
import { useLocale } from "@/hooks/use-locale";
import { DateTime } from "luxon";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/items/$id")({
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

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["item", { id }],
      queryFn: () => httpClient.get<SingleItem>(`/items/${id}`).catch(() => null),
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
            title: i18n.t("items.notFound"),
            description: i18n.t("items.notFound"),
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
            title: i18n.t("items.notFound"),
            description: i18n.t("items.notFound"),
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
  const { t } = useTranslation();
  const { id, locale } = Route.useParams();
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
          <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-4">
            <h1 className="min-w-0 text-2xl font-bold leading-tight">{item.title}</h1>
            <Badge>{t("items.badge")}</Badge>
          </div>
          <div className="mt-2 overflow-hidden rounded-xl border border-border/10">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] md:w-[300px]">
                    {t("items.table.itemId")}
                  </TableHead>
                  <TableHead className="border-l-border/10 border-l">{item.id}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{t("items.table.namespace")}</TableCell>
                  <TableCell
                    className={
                      "text-left font-mono border-l-border/10 border-l underline decoration-dotted decoration-border underline-offset-4"
                    }
                  >
                    <Link to="/{-$locale}/sandboxes/$id/items" params={{ id: item.namespace }}>
                      {internalNamespaces.includes(item.namespace) ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>{item.namespace}</TooltipTrigger>
                            <TooltipContent>
                              <p>{t("items.tooltip.internalNamespace")}</p>
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
                  <TableCell className="font-medium">{t("items.table.developer")}</TableCell>
                  <TableCell className="border-l-border/10 border-l">{item.developer}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t("items.table.entitlementType")}</TableCell>
                  <TableCell className="border-l-border/10 border-l">
                    {item.entitlementType}
                  </TableCell>
                </TableRow>
                {item.entitlementName &&
                  item.entitlementName !== item.id &&
                  item.entitlementName !== item.title && (
                    <TableRow>
                      <TableCell className="font-medium">
                        {t("items.table.entitlementName")}
                      </TableCell>
                      <TableCell className="border-l-border/10 border-l">
                        {item.entitlementName}
                      </TableCell>
                    </TableRow>
                  )}
                <TableRow>
                  <TableCell className="font-medium">{t("items.table.status")}</TableCell>
                  <TableCell className="border-l-border/10 border-l">{item.status}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">{t("items.table.creationDate")}</TableCell>
                  <TableCell className="border-l-border/10 border-l">
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
                  <TableCell className="font-medium">{t("items.table.lastModified")}</TableCell>
                  <TableCell className="border-l-border/10 border-l">
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
                  <TableCell className="font-medium">{t("items.table.platforms")}</TableCell>
                  <TableCell className="border-l-border/10 border-l inline-flex items-center justify-start gap-1">
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
      <hr className="w-full border-t border-border/10 my-4" />

      <div className="flex min-h-[75vh] h-full w-full flex-col items-start justify-start gap-4 md:flex-row">
        <aside className="w-full md:w-auto">
          <SectionsNav
            links={[
              {
                id: "",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>{t("items.tabs.item")}</span>
                  </span>
                ),
                href: `/items/${id}`,
              },
              {
                id: "assets",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>{t("items.tabs.assets")}</span>
                  </span>
                ),
                href: `/items/${id}/assets`,
              },
              {
                id: "images",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>{t("items.tabs.images")}</span>
                  </span>
                ),
                href: `/items/${id}/images`,
              },
              {
                id: "builds",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>{t("items.tabs.builds")}</span>
                  </span>
                ),
                href: `/items/${id}/builds`,
              },
              {
                id: "changelog",
                label: (
                  <span className="inline-flex items-center gap-2">
                    <span>{t("items.tabs.changelog")}</span>
                  </span>
                ),
                href: `/items/${id}/changelog`,
              },
            ]}
            activeSection={subPath ?? ""}
            onSectionChange={(location) => {
              const itemRoutes = {
                "": "/{-$locale}/items/$id",
                assets: "/{-$locale}/items/$id/assets",
                images: "/{-$locale}/items/$id/images",
                builds: "/{-$locale}/items/$id/builds",
                changelog: "/{-$locale}/items/$id/changelog",
              } as const;
              const to = itemRoutes[location as keyof typeof itemRoutes] ?? itemRoutes[""];

              navigate({
                to,
                params: { id, locale },
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
