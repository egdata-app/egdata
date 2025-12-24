import { textPlatformIcons } from "@/components/app/platform-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getQueryClient } from "@/lib/client";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import type { Asset } from "@/types/asset";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { dehydrate, HydrationBoundary, useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/offers/$id/metadata")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <MetadataPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { queryClient } = context;
    const { id } = params;

    const offer = await queryClient.ensureQueryData({
      queryKey: ["offer", { id }],
      queryFn: () => httpClient.get<SingleOffer>(`/offers/${id}`),
    });

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [
          "sandbox",
          {
            id: offer?.namespace,
          },
        ],
        queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${offer?.namespace}`),
      }),
      queryClient.prefetchQuery({
        queryKey: [
          "assets",
          {
            id: offer?.id,
          },
        ],
        queryFn: () =>
          httpClient.get<
            {
              assets: Asset;
            }[]
          >(`/offers/${offer?.id}/assets`),
      }),
    ]);

    return {
      id,
      offer,
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
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "offer",
      { id: params.id },
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
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
  const { id, offer: serverOffer } = Route.useLoaderData();
  const [offerQuery, sandboxQuery, assetsQuery] = useQueries({
    queries: [
      {
        queryKey: ["offer", { id }],
        queryFn: () => httpClient.get<SingleOffer>(`/offers/${id}`),
      },
      {
        queryKey: ["sandbox", { id: serverOffer?.namespace }],
        queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${serverOffer?.namespace}`),
      },
      {
        queryKey: ["assets", { id }],
        queryFn: () =>
          httpClient.get<
            {
              assets: Asset;
            }[]
          >(`/offers/${id}/assets`),
      },
    ],
  });

  const { data: offer } = offerQuery;
  const { data: assets } = assetsQuery;
  const { data: sandbox } = sandboxQuery;

  if (!offer || !assets || !sandbox) {
    return null;
  }

  return (
    <main className="flex flex-col gap-2 w-full">
      <h2 className="text-2xl font-bold">Metadata</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Type</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(offer.customAttributes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => (
              <TableRow key={key}>
                <TableCell>{key}</TableCell>
                <TableCell>{item.value}</TableCell>
              </TableRow>
            ))}
          <TableRow>
            <TableCell>Countries Blacklist</TableCell>
            <TableCell>
              <Countries countries={offer.countriesBlacklist} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Countries Whitelist</TableCell>
            <TableCell>
              <Countries countries={offer.countriesWhitelist} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Categories</TableCell>
            <TableCell>{offer.categories.join(", ")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Refund Type</TableCell>
            <TableCell>{offer.refundType}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Tags</TableCell>
            <TableCell>
              {offer.tags
                .filter((tag) => tag !== null)
                .map((tag) => tag.name)
                .join(", ")}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell>Age Ratings</TableCell>
            <TableCell>
              <AgeRatings ageRatings={sandbox?.ageGatings ?? {}} />
            </TableCell>
          </TableRow>
          {assets && assets?.length > 0 ? (
            <TableRow>
              <TableCell>Assets</TableCell>
              <TableCell>
                <Assets assets={assets} />
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </main>
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
      onKeyDown={() => setActive(!active)}
      className="cursor-pointer inline-flex items-center justify-start gap-2 flex-wrap"
    >
      {active
        ? countries
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

  return countries
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
        <div className="flex flex-row gap-2" key={key}>
          {rating.ratingImage && rating.ratingImage !== "" ? (
            <img
              key={key}
              src={rating.ratingImage}
              alt={key}
              title={`${rating.title} - ${rating.gameRating}`}
              className="size-20 mx-auto"
            />
          ) : (
            <div className="size-20 mx-auto inline-flex items-center justify-center bg-gray-900 rounded-lg">
              <span className="text-6xl font-bold">{rating.ageControl}</span>
            </div>
          )}
          <div className="flex flex-col gap-1 py-2">
            <span className="text-xs text-left font-bold">{rating.ratingSystem}</span>
            <span className="text-xs text-left">{rating.element}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Assets({ assets }: { assets: { assets: Asset }[] }) {
  try {
    return (
      <div className="flex flex-col gap-2 items-start justify-start">
        {assets
          .filter((a) => typeof a.assets !== "undefined")
          .filter(({ assets: asset }) => asset.platform)
          .map(({ assets: asset }) => (
            <div className="flex flex-row gap-2 items-center" key={asset._id}>
              {textPlatformIcons[asset.platform]}
              <span className="text-xs text-left">{asset.artifactId}</span>
              <span className="text-xs text-left">
                Download: {bytesToSize(asset.downloadSizeBytes)}
              </span>
              <span className="text-xs text-left">
                Install: {bytesToSize(asset.installedSizeBytes)}
              </span>
            </div>
          ))}
      </div>
    );
  } catch (error) {
    console.error(error);
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
