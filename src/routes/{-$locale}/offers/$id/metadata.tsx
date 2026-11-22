import { textPlatformIcons } from "@/components/app/platform-icons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import { captureError } from "@/lib/pulse-telemetry";
import i18n from "@/lib/i18n";
import { useLocale } from "@/hooks/use-locale";
import { offerOnlyQueryOptions, resolveQueryLocale } from "@/queries/offer";
import type { Asset } from "@/types/asset";
import type { SingleSandbox } from "@/types/single-sandbox";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/offers/$id/metadata")({
  component: MetadataPage,

  loader: async ({ params, context }) => {
    const { queryClient, locale, cookies } = context;
    const { id } = params;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);

    if (import.meta.env.SSR) {
      const offer = await queryClient.ensureQueryData(offerQuery).catch(() => null);

      if (offer) {
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: [
              "sandbox",
              {
                id: offer.namespace,
              },
            ],
            queryFn: () =>
              httpClient.v1Get<SingleSandbox>(`/sandboxes/${offer.namespace}`).catch(() => null),
          }),
          queryClient.prefetchQuery({
            queryKey: [
              "assets",
              {
                id: offer.id,
              },
            ],
            queryFn: () =>
              httpClient
                .v1Get<
                  {
                    assets: Asset;
                  }[]
                >(`/offers/${offer.id}/assets`)
                .catch(() => []),
          }),
        ]);
      }

      return {
        id,
        offer,
        locale: resolvedLocale,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    if (cachedOffer) {
      void queryClient.prefetchQuery({
        queryKey: [
          "sandbox",
          {
            id: cachedOffer.namespace,
          },
        ],
        queryFn: () =>
          httpClient.v1Get<SingleSandbox>(`/sandboxes/${cachedOffer.namespace}`).catch(() => null),
      });
      void queryClient.prefetchQuery({
        queryKey: [
          "assets",
          {
            id: cachedOffer.id,
          },
        ],
        queryFn: () =>
          httpClient
            .v1Get<
              {
                assets: Asset;
              }[]
            >(`/offers/${cachedOffer.id}/assets`)
            .catch(() => []),
      });
    }

    return {
      id,
      offer: cachedOffer ?? null,
      locale: resolvedLocale,
      isOfferLoaded: cachedOffer !== undefined,
    };
  },

  head: (ctx) => {
    if (!ctx.loaderData) {
      return {
        meta: [],
      };
    }

    const { offer, isOfferLoaded } = ctx.loaderData;

    if (!offer) {
      if (!isOfferLoaded) {
        return {
          meta: [],
        };
      }

      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, "Metadata"),
    };
  },
});

function MetadataPage() {
  const { id } = Route.useParams();
  const { offer: serverOffer } = Route.useLoaderData();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const offerQuery = useQuery(offerOnlyQueryOptions(id, locale));
  const offer = offerQuery.data ?? serverOffer;

  const [sandboxQuery, assetsQuery] = useQueries({
    queries: [
      {
        queryKey: ["sandbox", { id: offer?.namespace }],
        queryFn: () => httpClient.v1Get<SingleSandbox>(`/sandboxes/${offer?.namespace}`),
        enabled: Boolean(offer?.namespace),
      },
      {
        queryKey: ["assets", { id }],
        queryFn: () =>
          httpClient.v1Get<
            {
              assets: Asset;
            }[]
          >(`/offers/${id}/assets`),
      },
    ],
  });

  const { data: assets } = assetsQuery;
  const { data: sandbox } = sandboxQuery;

  if (offerQuery.isLoading || sandboxQuery.isLoading || assetsQuery.isLoading) {
    return (
      <section id="offer-metadata" className="flex flex-col w-full">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("offerDetail.metadata.title")}
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-2.5">
          {["m1", "m2", "m3", "m4", "m5", "m6", "m7"].map((key) => (
            <div key={key} className="grid grid-cols-3 gap-4">
              <Skeleton className="h-8 rounded-md" />
              <Skeleton className="col-span-2 h-8 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!offer || !assets || !sandbox) {
    return null;
  }

  return (
    <section id="offer-metadata" className="flex flex-col w-full">
      <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t("offerDetail.metadata.title")}
        </h2>
        <span className="rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {Object.keys(offer.customAttributes).length}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-card/80">
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[180px] md:w-[300px] px-4 font-display text-xs uppercase tracking-wider text-muted-foreground">
                {t("offerDetail.table.type")}
              </TableHead>
              <TableHead className="px-4 font-display text-xs uppercase tracking-wider text-muted-foreground">
                {t("offerDetail.table.value")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(offer.customAttributes)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, item]) => (
                <TableRow key={key}>
                  <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {key}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-foreground break-all whitespace-normal">
                    {item.value}
                  </TableCell>
                </TableRow>
              ))}
            <TableRow>
              <TableCell className="px-4 py-3 font-medium text-muted-foreground">
                {t("offerDetail.table.countriesBlacklist")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm whitespace-normal">
                <Countries countries={offer.countriesBlacklist} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 font-medium text-muted-foreground">
                {t("offerDetail.table.countriesWhitelist")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm whitespace-normal">
                <Countries countries={offer.countriesWhitelist} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 font-medium text-muted-foreground">
                {t("offerDetail.table.categories")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm whitespace-normal">
                {offer.categories.join(", ")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 font-medium text-muted-foreground">
                {t("offerDetail.table.refundType")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm">{offer.refundType}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 font-medium text-muted-foreground">
                {t("offerDetail.table.tags")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm whitespace-normal">
                {offer.tags
                  .filter((tag) => tag !== null)
                  .map((tag) => tag.name)
                  .join(", ")}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="px-4 py-3 font-medium text-muted-foreground">
                {t("offerDetail.table.ageRatings")}
              </TableCell>
              <TableCell className="px-4 py-3">
                <AgeRatings ageRatings={sandbox?.ageGatings ?? {}} />
              </TableCell>
            </TableRow>
            {assets && assets?.length > 0 ? (
              <TableRow>
                <TableCell className="px-4 py-3 font-medium text-muted-foreground">
                  {t("offerDetail.table.assets")}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Assets assets={assets} />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function Countries({ countries }: { countries: string[] | null }) {
  const [active, setActive] = useState(false);

  if (!countries) {
    return null;
  }

  // If active, show the countries flags, otherwise show the list of countries
  return (
    <span
      onClick={() => setActive(!active)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActive(!active);
        }
      }}
      role="button"
      tabIndex={0}
      className="cursor-pointer inline-flex items-center justify-start gap-2 flex-wrap"
    >
      {active
        ? [...countries]
            .sort()
            .map((country) => (
              <img
                key={country}
                src={`https://flagcdn.com/16x12/${country.toLowerCase()}.webp`}
                alt={country}
                style={{ width: "16px", height: "12px" }}
              />
            ))
        : countriesList(countries)}
    </span>
  );
}

/**
 * Converts the countries codes to the names in english
 * @param countries
 * @returns
 */
function countriesList(countries: string[] | null) {
  if (!countries) {
    return null;
  }

  const regionNameFmt = new Intl.DisplayNames(["en"], { type: "region" });

  return [...countries]
    .sort()
    .map((country) => {
      return regionNameFmt.of(country);
    })
    .join(", ");
}

function AgeRatings({ ageRatings }: { ageRatings: SingleSandbox["ageGatings"] }) {
  return (
    <div className="flex flex-col gap-2 items-start justify-start">
      {Object.entries(ageRatings).map(([key, rating]) => (
        <div className="flex flex-row gap-3 items-center" key={key}>
          {rating.ratingImage && rating.ratingImage !== "" ? (
            <img
              key={key}
              src={rating.ratingImage}
              alt={key}
              title={`${rating.title} - ${rating.gameRating}`}
              className="size-16 shrink-0"
            />
          ) : (
            <div className="size-16 shrink-0 inline-flex items-center justify-center rounded-xl border border-white/10 bg-muted/60">
              <span className="font-display text-3xl font-bold tabular-nums">
                {rating.ageControl}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1 py-1">
            <span className="text-xs text-left font-bold text-foreground">
              {rating.ratingSystem}
            </span>
            <span className="text-xs text-left text-muted-foreground">{rating.element}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Assets({ assets }: { assets: { assets: Asset }[] }) {
  const { t } = useTranslation();
  try {
    return (
      <div className="flex flex-col gap-2 items-start justify-start">
        {assets
          .filter((a) => typeof a.assets !== "undefined")
          .filter(({ assets: asset }) => asset.platform)
          .map(({ assets: asset }) => (
            <div
              className="flex flex-wrap flex-row gap-2.5 items-center rounded-lg border border-white/10 bg-background/40 px-3 py-1.5"
              key={asset._id}
            >
              {textPlatformIcons[asset.platform]}
              <span className="font-mono text-xs text-left text-foreground">
                {asset.artifactId}
              </span>
              <span className="text-xs text-left text-muted-foreground tabular-nums">
                {t("offerDetail.metadata.download")} {bytesToSize(asset.downloadSizeBytes)}
              </span>
              <span className="text-xs text-left text-muted-foreground tabular-nums">
                {t("offerDetail.metadata.install")} {bytesToSize(asset.installedSizeBytes)}
              </span>
            </div>
          ))}
      </div>
    );
  } catch (error) {
    console.error(error);
    captureError(error, {
      source: "offer-metadata.assets-render",
    });
    return null;
  }
}

const bytesToSize = (bytes: number) => {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = Number.parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
};
