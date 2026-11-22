import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import "@mdxeditor/editor/style.css";
import { useQueries, useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { getV1PaginationTotal, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import type { SingleReview } from "@/types/reviews";
import type { RatingsType } from "@egdata/core.schemas.ratings";
import { lazy, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ThumbsDown, ThumbsUp, ThumbsUpIcon } from "lucide-react";
import * as Portal from "@radix-ui/react-portal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StarsRating from "@/components/app/stars-rating";
import { CircularRating } from "@/components/app/circular-rating";
import Markdown from "react-markdown";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { useLocale } from "@/hooks/use-locale";
import { offerOnlyQueryOptions, offerPollsQueryOptions, resolveQueryLocale } from "@/queries/offer";
import { Viewer } from "@/components/app/viewer";
import { DateTime } from "luxon";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

const ReviewForm = lazy(() =>
  import("@/components/forms/add-review").then((mod) => {
    return {
      default: mod.ReviewForm,
    };
  }),
);

const EditReviewForm = lazy(() =>
  import("@/components/forms/edit-review").then((mod) => {
    return {
      default: mod.EditReviewForm,
    };
  }),
);

type ReviewSummary = {
  overallScore: number;
  recommendedPercentage: number;
  notRecommendedPercentage: number;
  totalReviews: number;
};

type ReviewsFilter = "all" | "verified" | "not-verified";

const getVerificationParam = (verified: ReviewsFilter): "true" | "false" | undefined => {
  if (verified === "verified") return "true";
  if (verified === "not-verified") return "false";
  return undefined;
};

async function fetchOfferReviews(id: string, verified: "true" | "false" | undefined) {
  const envelope = await httpClient.v1GetEnvelope<SingleReview[], V1CursorPaginationMeta>(
    `/offers/${id}/reviews`,
    {
      params: { verified },
    },
  );
  const elements = Array.isArray(envelope?.data) ? envelope.data : [];
  return {
    elements,
    page: 1,
    total: getV1PaginationTotal(envelope?.meta?.pagination, elements.length),
  };
}

export const Route = createFileRoute("/{-$locale}/offers/$id/reviews")({
  component: Reviews,

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient, epicToken, locale, cookies, session } = context;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const userId = session?.user?.email.split("@")[0] ?? epicToken?.account_id;
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);

    const startPrefetches = () => [
      queryClient.prefetchQuery({
        queryKey: [
          "reviews",
          {
            id,
            page: 1,
            verified: getVerificationParam("all"),
          },
        ],
        queryFn: () => fetchOfferReviews(id, getVerificationParam("all")).catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: [
          "reviews-summary",
          {
            id,
            verified: getVerificationParam("all"),
          },
        ],
        queryFn: () =>
          httpClient
            .v1Get<ReviewSummary>(`/offers/${id}/reviews-summary`, {
              params: {
                verified: getVerificationParam("all"),
              },
            })
            .catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: ["ratings", { id }],
        queryFn: () => httpClient.v1Get<RatingsType>(`/offers/${id}/ratings`).catch(() => null),
      }),
    ];

    if (import.meta.env.SSR) {
      const [offer] = await Promise.all([
        queryClient.ensureQueryData(offerQuery).catch(() => null),
        Promise.allSettled(startPrefetches()),
      ]);

      return {
        id,
        userId,
        offer,
        locale: resolvedLocale,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void startPrefetches();

    return {
      id,
      userId,
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
      meta: generateOfferMeta(offer, "Reviews"),
    };
  },
});

function Reviews() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { id } = Route.useParams();
  const { offer: loaderOffer, userId } = Route.useLoaderData();
  const { data: queryOffer } = useQuery(offerOnlyQueryOptions(id, locale));
  const offer = queryOffer ?? loaderOffer;
  const [page] = useState(1);
  const [filter, setFilter] = useState<ReviewsFilter>("all");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewsQuery, summaryQuery, pollsQuery, ratingsQuery, permissionsQuery] = useQueries({
    queries: [
      {
        queryKey: [
          "reviews",
          {
            id,
            page,
            verified: getVerificationParam(filter),
          },
        ],
        queryFn: () => fetchOfferReviews(id, getVerificationParam(filter)),
      },
      {
        queryKey: [
          "reviews-summary",
          {
            id,
            verified: getVerificationParam(filter),
          },
        ],
        queryFn: () =>
          httpClient.v1Get<ReviewSummary>(`/offers/${id}/reviews-summary`, {
            params: {
              verified: getVerificationParam(filter),
            },
          }),
      },
      offerPollsQueryOptions(id),
      {
        queryKey: [
          "ratings",
          {
            id,
          },
        ],
        queryFn: () => httpClient.v1Get<RatingsType>(`/offers/${id}/ratings`),
      },
      {
        queryKey: ["permissions", { id }],
        queryFn: () =>
          httpClient.get<{ canReview: boolean }>(`/offers/${id}/reviews/permissions`, {
            withCredentials: true,
          }),
        enabled: Boolean(userId),
      },
    ],
  });

  const reviews = reviewsQuery.data;
  const summary = summaryQuery.data;
  const poll = pollsQuery.data;
  const ratings = ratingsQuery.data;
  const permissions = permissionsQuery.data;
  const reviewItems = Array.isArray(reviews?.elements) ? reviews.elements : [];

  const userCanReview = permissions
    ? {
        status: permissions.canReview,
        label: t("offerDetail.reviews.alreadyReviewed"),
      }
    : {
        status: false,
        label: t("offerDetail.reviews.loginToReview"),
      };

  const isReleased = offer
    ? new Date(offer?.releaseDate || offer?.effectiveDate) < new Date()
    : false;

  return (
    <main className="flex h-full w-full flex-col items-start justify-start gap-6 mt-6">
      <div className="grid gap-5 w-full">
        <div className="flex items-center flex-col gap-6 w-full">
          {poll?.averageRating && (
            <section className="flex flex-col items-start justify-center text-left w-full">
              <div className="w-full border-b border-border/60 pb-3 mb-5 text-left">
                <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {t("offerDetail.reviews.epicRating")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("offerDetail.reviews.epicRatingDescription")}
                </p>
              </div>
              <Card className="w-full rounded-xl border border-white/10 bg-card/80 text-foreground p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-evenly gap-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    <h2 className="font-display text-5xl sm:text-6xl font-bold mb-1 tabular-nums">
                      {poll?.averageRating.toLocaleString(locale, {
                        maximumFractionDigits: 1,
                      }) ?? "-"}
                    </h2>
                    <StarsRating rating={poll.averageRating} />
                  </div>
                  <div
                    className={cn(
                      "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-flow-col w-full md:w-auto",
                      poll.pollResult.length >= 3 && "lg:grid-rows-3",
                      poll.pollResult.length === 2 ? "lg:grid-rows-2" : undefined,
                      poll.pollResult.length === 1 ? "lg:grid-rows-1" : undefined,
                    )}
                  >
                    {[...poll.pollResult]
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 6)
                      .map((result) => (
                        <Link
                          key={result.id}
                          className="flex flex-row gap-4 items-center justify-start p-4 w-full sm:w-[280px] lg:w-[300px] rounded-xl border border-white/10 bg-muted/40 text-foreground shadow-sm transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/60 hover:bg-muted/70 hover:shadow-lg hover:shadow-black/35"
                          to="/{-$locale}/search"
                          search={{ tags: result.tagId }}
                        >
                          <img
                            src={result.localizations.resultEmoji}
                            alt={result.localizations.text}
                            className="size-10 shrink-0"
                          />
                          <div className="flex flex-col items-start justify-center min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {result.localizations.resultText}
                            </p>
                            <p className="text-base font-bold truncate max-w-full">
                              {result.localizations.resultTitle}
                            </p>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              </Card>
            </section>
          )}
          <div className="w-full">
            <div className="w-full border-b border-border/60 pb-3 mb-5 text-left">
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("offerDetail.reviews.egdataRating")}
              </h3>
            </div>
            <div className="flex flex-col md:flex-row items-stretch justify-between w-full min-h-32 gap-4">
              <Card className="w-full rounded-xl border border-white/10 bg-card/80 text-foreground flex items-center">
                <CardContent className="w-full p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-evenly gap-6">
                    <div className="flex flex-col items-center justify-center text-center">
                      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        {t("offerDetail.reviews.overallScore")}
                      </h2>
                      <p className="font-display text-3xl sm:text-4xl font-bold text-center tabular-nums">
                        {t("offerDetail.reviews.scoreOutOf10", {
                          score: summary?.overallScore ?? "-",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-between gap-3 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {t("offerDetail.reviews.basedOnReviews", {
                          count: summary?.totalReviews ?? 0,
                        })}
                      </span>
                      <RecommendationBar
                        recommendedPercentage={summary?.recommendedPercentage ?? 0}
                        notRecommendedPercentage={summary?.notRecommendedPercentage ?? 0}
                        totalReviews={summary?.totalReviews ?? 0}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="w-full md:w-fit shrink-0 rounded-xl border border-white/10 bg-card/80 flex flex-col items-stretch justify-center p-4 gap-2.5 text-left">
                <Select
                  selectedKey={filter}
                  onSelectionChange={(value) => setFilter(String(value) as ReviewsFilter)}
                  placeholder={t("offerDetail.reviews.allReviews")}
                >
                  <SelectTrigger className="w-full md:w-[190px] border-white/10 bg-background/40 transition-colors duration-150 hover:border-primary/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem id="all">{t("offerDetail.reviews.allReviews")}</SelectItem>
                    <SelectItem id="verified">{t("offerDetail.reviews.onlyVerified")}</SelectItem>
                    <SelectItem id="not-verified">
                      {t("offerDetail.reviews.notVerified")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="text-sm w-full border-white/10 transition-colors duration-150 hover:border-primary/60"
                  onPress={() => setShowReviewForm((prev) => !prev)}
                  isDisabled={!isReleased || !userCanReview.status}
                >
                  {userCanReview.status
                    ? t("offerDetail.reviews.leaveReview")
                    : userCanReview.label}
                </Button>
              </Card>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <TooltipTrigger>
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <InfoCircledIcon className="size-4" fill="currentColor" />
            </span>
            <Tooltip>
              <p className="text-xs max-w-sm">
                {t("offerDetail.reviews.ownershipVerificationTooltip")}{" "}
                <Link
                  to="/{-$locale}/dashboard"
                  className="text-blue-600 underline-offset-4 hover:underline"
                >
                  {t("offerDetail.reviews.yourDashboard")}
                </Link>
              </p>
            </Tooltip>
          </TooltipTrigger>
          <p className="text-muted-foreground inline-flex flex-wrap items-center gap-1">
            <strong className="text-foreground font-semibold">
              {t("offerDetail.reviews.ownershipVerification")}
            </strong>{" "}
            {t("offerDetail.reviews.ownershipVerificationDescription")}
          </p>
        </div>
      </div>
      {reviewsQuery.isLoading ? (
        <div className="grid w-full max-w-7xl grid-cols-1 gap-6 mx-auto md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton cards
              key={index}
              className="rounded-xl border border-white/10 bg-card/80 p-5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="ml-auto h-8 w-28 rounded-lg" />
              </div>
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
          ))}
        </div>
      ) : reviewItems.length ? (
        <div className="grid w-full max-w-7xl grid-cols-1 gap-6 mx-auto md:grid-cols-2">
          {reviewItems.map((review) => (
            <Review key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="w-full max-w-4xl mx-auto rounded-xl border border-white/10 bg-card/80 px-6 py-16 text-center flex flex-col items-center justify-center gap-2">
          <h6 className="font-display text-lg font-semibold text-foreground">
            {isReleased ? t("offerDetail.reviews.noReviews") : t("offerDetail.reviews.notReleased")}
          </h6>
          <p className="text-sm text-muted-foreground max-w-md">
            {isReleased ? t("offerDetail.reviews.beFirst") : t("offerDetail.reviews.checkBack")}
          </p>
          <Button
            variant="outline"
            className="mt-4 border-white/10 transition-colors duration-150 hover:border-primary/60"
            onPress={() => setShowReviewForm((prev) => !prev)}
            isDisabled={!isReleased || !userCanReview.status}
          >
            {t("offerDetail.reviews.leaveReview")}
          </Button>
        </div>
      )}
      <Portal.Root>
        {showReviewForm && <ReviewForm setIsOpen={setShowReviewForm} offer={offer} />}
      </Portal.Root>
      {ratings && (
        <div className="flex items-center flex-col gap-4 w-full pt-2">
          <section className="flex flex-col items-start justify-center text-left w-full">
            <div className="w-full border-b border-border/60 pb-3 mb-5 text-left">
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("offerDetail.reviews.criticReviews")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {t("offerDetail.reviews.basedOnCriticReviews", {
                  count: ratings?.reviews.length ?? 0,
                })}
              </p>
            </div>
            <Card className="w-full rounded-xl border border-white/10 bg-card/80 text-foreground p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-evenly gap-6">
                <div className="flex flex-row items-center justify-center gap-4">
                  <span className="text-base sm:text-lg font-medium text-center">
                    {t("offerDetail.reviews.opencriticRating")}
                  </span>
                  <img
                    src={`https://img.opencritic.com/mighty-man/${ratings.criticRating.toLowerCase()}-man.png`}
                    alt={t("offerDetail.reviews.opencriticRatingAlt")}
                    className="size-20"
                  />
                </div>
                <div className="flex flex-row items-center justify-center gap-4">
                  <span className="text-base sm:text-lg font-medium text-center">
                    {t("offerDetail.reviews.topCriticAverage")}
                  </span>
                  <div className="tabular-nums">
                    <CircularRating
                      rating={ratings?.criticAverage ?? 0}
                      maxRating={100}
                      size="sm"
                      strokeWidth={10}
                    />
                  </div>
                </div>
                <div className="flex flex-row items-center justify-center gap-4">
                  <span className="text-base sm:text-lg font-medium text-center">
                    {t("offerDetail.reviews.criticsRecommend")}
                  </span>
                  <div className="tabular-nums">
                    <CircularRating
                      rating={ratings?.recommendPercentage ?? 0}
                      maxRating={100}
                      size="sm"
                      strokeWidth={10}
                      suffix="%"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </div>
      )}
    </main>
  );
}

function Review({ review, full }: { review: SingleReview; full?: boolean }) {
  const { t } = useTranslation();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFull, setShowFull] = useState(full);
  const { userId } = Route.useLoaderData();
  const userAvatar =
    review.user.avatarUrl?.variants[0] ??
    `https://shared-static-prod.epicgames.com/epic-profile-icon/D8033C/${review.user.displayName[0].toUpperCase()}/icon.png?size=512`;

  return (
    <article className="p-5 rounded-xl border border-white/10 bg-card/80 text-foreground max-w-2xl mx-auto w-full h-full flex flex-col transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-primary/60 hover:bg-card hover:shadow-lg hover:shadow-black/35">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Avatar>
          <AvatarImage src={userAvatar as string} alt={review.user.displayName} />
          <AvatarFallback>{review.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Link
          className="inline-flex items-center space-x-2 transition-colors duration-150 hover:text-primary"
          to="/{-$locale}/profile/$id"
          params={{ id: review.user.accountId }}
          search={{}}
        >
          <div className="font-bold">{review.user.displayName}</div>
          {review.verified && (
            <Badge variant="secondary">{t("offerDetail.reviews.verifiedOwner")}</Badge>
          )}
        </Link>
        <div className="ml-auto flex items-center space-x-2 border border-white/10 bg-muted/50 px-2.5 py-1 rounded-lg">
          <div className="text-foreground px-1.5 py-0.5 rounded-md font-bold tabular-nums">
            {review.rating} / 10
          </div>
          <div className="flex items-center space-x-1 font-bold text-sm">
            <span>
              {review.recommended
                ? t("offerDetail.reviews.recommended")
                : t("offerDetail.reviews.notRecommended")}
            </span>
            <ThumbsUpIcon
              className={cn(
                "p-[4px] size-7",
                review.recommended ? "fill-blue-600" : "fill-red-600 transform rotate-180",
              )}
              stroke="none"
            />
          </div>
        </div>
      </div>
      <div className="bg-muted/40 border border-white/5 p-4 rounded-lg h-full flex-1">
        <h3 className="font-display font-bold mb-2 text-lg md:text-xl tracking-tight">
          {review.title}
        </h3>
        <div className="relative">
          <div className="mb-4 prose prose-sm md:prose-base prose-invert max-w-none min-w-1/2">
            {typeof review.content === "string" ? (
              <Markdown>
                {review.content.length <= 750
                  ? review.content
                  : `${review.content.slice(0, 750)}...`}
              </Markdown>
            ) : null}
            {typeof review.content === "object" ? <Viewer content={review.content} /> : null}
          </div>
          {review.content.length > 750 && (
            <div className="absolute bottom-0 left-0 w-full">
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b from-transparent via-card/60 to-card pointer-events-none" />
              <Button
                variant="link"
                className="text-sm absolute z-10 -bottom-4 right-0 left-0 w-fit mx-auto inline-flex items-center gap-1 font-bold transition-colors duration-150"
                onClick={() => setShowFull(true)}
              >
                <ChevronDown className="size-4" />
                {t("offerDetail.reviews.readMore")}
                <ChevronDown className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="inline-flex justify-between items-center w-full">
        <div className="mt-4 inline-flex justify-between items-center w-full gap-2">
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground tabular-nums">
              {t("offerDetail.reviews.reviewedOn")}{" "}
              {DateTime.fromISO(review.createdAt).setLocale("en-GB").toLocaleString({
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {review.editions?.length && review.editions.length > 0 ? (
              <TooltipTrigger>
                <span tabIndex={0} className="inline-flex items-center gap-1 ml-2">
                  <InfoCircledIcon className="size-4" fill="currentColor" />
                </span>
                <Tooltip>
                  <span className="text-xs flex flex-col gap-1 tabular-nums">
                    <span>
                      {t("offerDetail.reviews.lastUpdatedOn")}{" "}
                      {DateTime.fromISO(review.updatedAt).setLocale("en-GB").toLocaleString({
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </span>
                    {review.editions && (
                      <span>
                        {t("offerDetail.reviews.editedTimes", {
                          count: review.editions?.length ?? 0,
                        })}
                      </span>
                    )}
                  </span>
                </Tooltip>
              </TooltipTrigger>
            ) : null}
          </div>
          {userId === review.userId && (
            <Button
              variant="outline"
              className="text-sm border-white/10 transition-colors duration-150 hover:border-primary/60"
              onClick={() => setShowEditForm((prev) => !prev)}
            >
              {t("offerDetail.reviews.edit")}
            </Button>
          )}
        </div>
        {userId === review.userId && (
          <Portal.Root>
            {showEditForm && (
              <EditReviewForm
                setIsOpen={setShowEditForm}
                previousReview={review}
                offer={undefined}
              />
            )}
          </Portal.Root>
        )}
        <Portal.Root>
          {showFull && <FullReview review={review} setIsOpen={setShowFull} />}
        </Portal.Root>
      </div>
    </article>
  );
}

function FullReview({
  review,
  setIsOpen,
}: {
  review: SingleReview;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { t } = useTranslation();
  const userAvatar =
    review.user.avatarUrl?.variants[0] ??
    `https://shared-static-prod.epicgames.com/epic-profile-icon/D8033C/${review.user.displayName[0].toUpperCase()}/icon.png?size=512`;

  return (
    <div className="fixed inset-0 h-full w-full flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 z-20">
      <span
        className="fixed inset-0 cursor-pointer"
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
      />
      <div className="p-2 rounded-xl border border-white/10 bg-card text-foreground max-w-2xl mx-auto w-full z-30 shadow-2xl shadow-black/50">
        <div className="w-full p-4 rounded-lg">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Avatar>
              <AvatarImage src={userAvatar as string} alt={review.user.displayName} />
              <AvatarFallback>{review.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="inline-flex items-center space-x-2">
              <div className="font-bold">{review.user.displayName}</div>
              {review.verified && (
                <Badge variant="secondary">{t("offerDetail.reviews.verifiedOwner")}</Badge>
              )}
            </div>
            <div className="ml-auto flex items-center space-x-2 border border-white/10 bg-muted/50 px-2.5 py-1 rounded-lg">
              <div className="text-foreground px-1.5 py-0.5 rounded-md font-bold tabular-nums">
                {review.rating} / 10
              </div>
              <div className="flex items-center space-x-1 font-bold text-sm">
                <span>
                  {review.recommended
                    ? t("offerDetail.reviews.recommended")
                    : t("offerDetail.reviews.notRecommended")}
                </span>
                <ThumbsUpIcon
                  className={cn(
                    "p-[4px] size-7",
                    review.recommended ? "fill-blue-600" : "fill-red-600 transform rotate-180",
                  )}
                  stroke="none"
                />
              </div>
            </div>
          </div>
          <div className="bg-muted/40 border border-white/5 p-4 rounded-lg">
            <h3 className="font-display font-bold mb-2 text-lg tracking-tight">{review.title}</h3>
            <div className="relative">
              <ScrollArea className="h-[50vh]">
                <div className="mb-4 prose prose-sm prose-invert max-w-none mr-2">
                  {typeof review.content === "string" ? (
                    <Markdown>{review.content}</Markdown>
                  ) : (
                    <Viewer content={review.content} />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="mt-4 inline-flex justify-between items-center w-full">
            <span className="text-sm text-muted-foreground tabular-nums">
              {t("offerDetail.reviews.reviewedOn")}{" "}
              {DateTime.fromISO(review.createdAt).setLocale("en-GB").toLocaleString({
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <Button
              variant="outline"
              className="text-sm border-white/10 transition-colors duration-150 hover:border-primary/60"
              onClick={() => setIsOpen(false)}
            >
              {t("offerDetail.reviews.close")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationBar({
  recommendedPercentage,
  notRecommendedPercentage,
  totalReviews,
}: {
  recommendedPercentage: number;
  notRecommendedPercentage: number;
  totalReviews: number;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<"recommended" | "notRecommended" | null>(null);

  return (
    <div className="flex flex-col gap-2 relative w-full max-w-[300px] sm:w-[300px]">
      <div className="absolute inset-0 bg-transparent w-full h-full flex flex-row items-center justify-between gap-2">
        <span
          className="relative z-10 cursor-pointer h-full"
          style={{ width: `${(recommendedPercentage ?? 0) * 100}%` }}
          onMouseEnter={() => setHovered("recommended")}
          onMouseLeave={() => setHovered(null)}
        />
        <span
          className="relative z-10 cursor-pointer h-full"
          style={{ width: `${(notRecommendedPercentage ?? 0) * 100}%` }}
          onMouseEnter={() => setHovered("notRecommended")}
          onMouseLeave={() => setHovered(null)}
        />
      </div>
      <div className="flex flex-row items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-1 font-bold tabular-nums">
          <ThumbsUp className="w-5 h-5 fill-blue-600" stroke="none" />
          {(hovered === "notRecommended" || hovered === null) && (
            <span className="text-sm font-bold">{(recommendedPercentage ?? 0) * 100}%</span>
          )}
          {hovered === "recommended" && (
            <span className="text-sm">
              {t("offerDetail.reviews.reviewCount", {
                count: recommendedPercentage * totalReviews,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 font-bold tabular-nums">
          {hovered === "notRecommended" && (
            <span className="text-sm">
              {t("offerDetail.reviews.reviewCount", {
                count: notRecommendedPercentage * totalReviews,
              })}
            </span>
          )}
          {(hovered === "recommended" || hovered === null) && (
            <span className="text-sm font-bold">{(notRecommendedPercentage ?? 0) * 100}%</span>
          )}
          <ThumbsDown className="w-5 h-5 fill-red-600" stroke="none" />
        </div>
      </div>
      <div className="flex h-[5px] w-full overflow-hidden rounded-full gap-1 relative bg-muted/40">
        {/* biome-ignore lint/a11y/useFocusableInteractive: <explanation> */}
        <div
          className={cn(
            "bg-blue-600 rounded-full transition-all duration-300 ease-in-out cursor-pointer",
            hovered === "notRecommended" ? "opacity-50" : "opacity-100",
          )}
          style={{ width: `${(recommendedPercentage ?? 0) * 100}%` }}
          role="progressbar"
          aria-valuenow={(recommendedPercentage ?? 0) * 100}
          aria-valuemin={0}
          aria-valuemax={100}
          onMouseEnter={() => setHovered("recommended")}
          onMouseLeave={() => setHovered(null)}
        />
        {/* biome-ignore lint/a11y/useFocusableInteractive: <explanation> */}
        <div
          className={cn(
            "bg-red-600 rounded-full transition-all duration-300 ease-in-out cursor-pointer",
            hovered === "recommended" ? "opacity-50" : "opacity-100",
          )}
          style={{ width: `${(notRecommendedPercentage ?? 0) * 100}%` }}
          role="progressbar"
          aria-valuenow={(notRecommendedPercentage ?? 0) * 100}
          aria-valuemin={0}
          aria-valuemax={100}
          onMouseEnter={() => setHovered("notRecommended")}
          onMouseLeave={() => setHovered(null)}
        />
      </div>
    </div>
  );
}
