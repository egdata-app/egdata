import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import "@mdxeditor/editor/style.css";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQueries,
} from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import type { SingleReview } from "@/types/reviews";
import type { RatingsType } from "@egdata/core.schemas.ratings";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import type { SingleOffer } from "@/types/single-offer";
import { lazy, useState } from "react";
import type { SinglePoll } from "@/types/polls";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ThumbsDown, ThumbsUp, ThumbsUpIcon } from "lucide-react";
import * as Portal from "@radix-ui/react-portal";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StarsRating from "@/components/app/stars-rating";
import { CircularRating } from "@/components/app/circular-rating";
import Markdown from "react-markdown";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getQueryClient } from "@/lib/client";
import { useLocale } from "@/hooks/use-locale";
import { offerOnlyQueryOptions } from "@/queries/offer-gql";
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

const routeApi = getRouteApi("__root__");

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

export const Route = createFileRoute("/{-$locale}/offers/$id/reviews")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      userId: string | undefined;
      offer: SingleOffer | null;
      locale: string | undefined;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <Reviews />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient, epicToken, locale, session } = context;

    const user = epicToken;
    const offer = await queryClient.ensureQueryData(offerOnlyQueryOptions(id, locale));

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: [
          "reviews",
          {
            id: params.id,
            page: 1,
            verified: getVerificationParam("all"),
          },
        ],
        queryFn: () =>
          httpClient
            .get<{
              elements: Array<SingleReview>;
              page: number;
              total: number;
              limit: number;
            }>(`/offers/${params.id}/reviews`, {
              params: {
                page: 1,
                verified: getVerificationParam("all"),
              },
            })
            .catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: [
          "reviews-summary",
          {
            id: params.id,
            verified: getVerificationParam("all"),
          },
        ],
        queryFn: () =>
          httpClient
            .get<ReviewSummary>(`/offers/${params.id}/reviews-summary`, {
              params: {
                verified: getVerificationParam("all"),
              },
            })
            .catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: ["ratings", { id: params.id }],
        queryFn: () =>
          httpClient.get<RatingsType>(`/offers/${params.id}/ratings`).catch(() => null),
      }),
    ]);

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      userId: session?.user?.email.split("@")[0] ?? user?.account_id,
      offer,
      locale,
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData.dehydratedState, [
      ...offerOnlyQueryOptions(params.id, ctx.loaderData.locale).queryKey,
    ]);

    if (!offer)
      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };

    return {
      meta: generateOfferMeta(offer, "Reviews"),
    };
  },
});

function Reviews() {
  const { t } = useTranslation();
  const { epicToken } = routeApi.useRouteContext();
  const { locale } = useLocale();
  const { offer, id } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    userId: string | undefined;
    offer: SingleOffer | null;
    locale: string | undefined;
  };
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
        queryFn: () =>
          httpClient.get<{
            elements: SingleReview[];
            page: number;
            total: number;
          }>(`/offers/${id}/reviews`, {
            params: { page, verified: getVerificationParam(filter) },
            headers: epicToken ? { Authorization: `Bearer ${epicToken.access_token}` } : undefined,
          }),
        refetchOnMount: "always",
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
          httpClient.get<ReviewSummary>(`/offers/${id}/reviews-summary`, {
            params: {
              verified: getVerificationParam(filter),
            },
          }),
      },
      {
        queryKey: [
          "polls",
          {
            offer: id,
          },
        ],
        queryFn: () => httpClient.get<SinglePoll>(`/offers/${id}/polls`),
      },
      {
        queryKey: [
          "ratings",
          {
            id,
          },
        ],
        queryFn: () => httpClient.get<RatingsType>(`/offers/${id}/ratings`),
      },
      {
        queryKey: ["permissions", { id }],
        queryFn: () =>
          httpClient.get<{ canReview: boolean }>(`/offers/${id}/reviews/permissions`, {
            withCredentials: true,
          }),
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
    <main className="flex h-full w-full flex-col items-start justify-start gap-1">
      <div className="grid gap-4 w-full">
        <div className="flex items-center flex-col gap-4">
          {poll?.averageRating && (
            <section className="flex flex-col items-start justify-center text-left w-full">
              <div className="flex flex-col items-start justify-center text-center mb-4">
                <h3 className="text-2xl font-semibold mb-1 text-left">
                  {t("offerDetail.reviews.epicRating")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("offerDetail.reviews.epicRatingDescription")}
                </p>
              </div>
              <Card className="w-full bg-card text-foreground p-4">
                <div className="flex flex-row items-center justify-evenly gap-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <h2 className="text-6xl font-bold mb-1">
                      {poll?.averageRating.toLocaleString(locale, {
                        maximumFractionDigits: 1,
                      }) ?? "-"}
                    </h2>
                    <StarsRating rating={poll.averageRating} />
                  </div>
                  <div
                    className={cn(
                      "grid grid-rows-3 grid-flow-col gap-4",
                      poll.pollResult.length === 2 ? "grid-rows-2" : undefined,
                      poll.pollResult.length === 1 ? "grid-rows-1" : undefined,
                    )}
                  >
                    {poll.pollResult
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 6)
                      .map((result) => (
                        <Link
                          key={result.id}
                          className="bg-muted text-foreground flex flex-row gap-4 items-center justify-start p-4 w-[300px] shadow-sm rounded-lg transform transition-transform hover:translate-y-[-2px]"
                          to="/{-$locale}/search"
                          search={{ tags: result.tagId }}
                        >
                          <img
                            src={result.localizations.resultEmoji}
                            alt={result.localizations.text}
                            className="size-10"
                          />
                          <div className="flex flex-col items-start justify-center">
                            <p className="text-xs text-muted-foreground">
                              {result.localizations.resultText}
                            </p>
                            <p className="text-base font-bold">
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
          <hr className="border-t border-border/30 my-2 w-full" />
          <div className="flex flex-col items-start justify-center text-center w-full">
            <h3 className="text-2xl font-semibold mb-1 text-left">
              {t("offerDetail.reviews.egdataRating")}
            </h3>
          </div>
          <div className="flex items-center justify-between flex-row w-full h-32 gap-4">
            <Card className="w-full bg-card text-foreground h-32">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-evenly gap-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <h2 className="text-lg font-semibold mb-1">
                      {t("offerDetail.reviews.overallScore")}
                    </h2>
                    <p className="text-4xl font-bold text-center">
                      {t("offerDetail.reviews.scoreOutOf10", {
                        score: summary?.overallScore ?? "-",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-between gap-4">
                    <span className="text-sm">
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
            <Card className="w-fit flex flex-col items-start justify-center p-4 h-full gap-2 text-left">
              <Select value={filter} onValueChange={(value) => setFilter(value as ReviewsFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("offerDetail.reviews.allReviews")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("offerDetail.reviews.allReviews")}</SelectItem>
                  <SelectItem value="verified">{t("offerDetail.reviews.onlyVerified")}</SelectItem>
                  <SelectItem value="not-verified">
                    {t("offerDetail.reviews.notVerified")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="text-sm w-full"
                onClick={() => setShowReviewForm((prev) => !prev)}
                disabled={!isReleased || !userCanReview.status}
              >
                {userCanReview.status ? t("offerDetail.reviews.leaveReview") : userCanReview.label}
              </Button>
            </Card>
          </div>
        </div>
        <TooltipProvider>
          <div className="inline-flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger className="inline-flex items-center gap-1">
                <InfoCircledIcon className="size-4" fill="currentColor" />
              </TooltipTrigger>
              <p className="text-muted-foreground inline-flex items-center gap-1">
                <strong>{t("offerDetail.reviews.ownershipVerification")}</strong>{" "}
                {t("offerDetail.reviews.ownershipVerificationDescription")}
              </p>
              <TooltipContent>
                <p className="text-xs max-w-sm">
                  {t("offerDetail.reviews.ownershipVerificationTooltip")}{" "}
                  <Link to="/{-$locale}/dashboard" className="text-blue-600">
                    {t("offerDetail.reviews.yourDashboard")}
                  </Link>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      {reviewItems.length ? (
        <div className="grid w-full max-w-7xl grid-cols-1 gap-6 mx-auto md:grid-cols-2">
          {reviewItems.map((review) => (
            <Review key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="min-h-[400px] w-full max-w-4xl mx-auto text-center">
          <h6 className="text-lg font-semibold">
            {isReleased ? t("offerDetail.reviews.noReviews") : t("offerDetail.reviews.notReleased")}
          </h6>
          <p className="text-muted-foreground">
            {isReleased ? t("offerDetail.reviews.beFirst") : t("offerDetail.reviews.checkBack")}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowReviewForm((prev) => !prev)}
            disabled={!isReleased || !userCanReview.status}
          >
            {t("offerDetail.reviews.leaveReview")}
          </Button>
        </div>
      )}
      <Portal.Root>
        {showReviewForm && <ReviewForm setIsOpen={setShowReviewForm} offer={offer} />}
      </Portal.Root>
      <hr className="border-t border-border/30 my-2" />
      {ratings && (
        <div className="flex items-center flex-col gap-4 w-full">
          <section className="flex flex-col items-start justify-center text-left w-full">
            <div className="flex flex-col items-start justify-center text-center mb-4">
              <h3 className="text-2xl font-semibold mb-1 text-left">
                {t("offerDetail.reviews.criticReviews")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("offerDetail.reviews.basedOnCriticReviews", {
                  count: ratings?.reviews.length ?? 0,
                })}
              </p>
            </div>
            <Card className="w-full bg-card text-foreground p-4">
              <div className="flex flex-row items-center justify-evenly gap-4">
                <div className="flex flex-row items-center justify-center gap-4">
                  <span className="text-xl text-center">
                    {t("offerDetail.reviews.opencriticRating")}
                  </span>
                  <img
                    src={`https://img.opencritic.com/mighty-man/${ratings.criticRating.toLowerCase()}-man.png`}
                    alt={t("offerDetail.reviews.opencriticRatingAlt")}
                    className="size-20"
                  />
                </div>
                <div className="flex flex-row items-center justify-center gap-4">
                  <span className="text-xl text-center">
                    {t("offerDetail.reviews.topCriticAverage")}
                  </span>
                  <CircularRating
                    rating={ratings?.criticAverage ?? 0}
                    maxRating={100}
                    size="sm"
                    strokeWidth={10}
                  />
                </div>
                <div className="flex flex-row items-center justify-center gap-4">
                  <span className="text-xl text-center">
                    {t("offerDetail.reviews.criticsRecommend")}
                  </span>
                  <CircularRating
                    rating={ratings?.recommendPercentage ?? 0}
                    maxRating={100}
                    size="sm"
                    strokeWidth={10}
                    suffix="%"
                  />
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
  const { userId } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    userId: string | undefined;
    offer: SingleOffer | null;
    locale: string | undefined;
  };
  const userAvatar =
    review.user.avatarUrl?.variants[0] ??
    `https://shared-static-prod.epicgames.com/epic-profile-icon/D8033C/${review.user.displayName[0].toUpperCase()}/icon.png?size=512`;

  return (
    <div className="p-4 bg-card text-foreground rounded-lg max-w-2xl min-w-1/2 mx-auto w-full h-full flex flex-col">
      <div className="flex items-center mb-4">
        <Avatar>
          <AvatarImage src={userAvatar as string} alt={review.user.displayName} />
          <AvatarFallback>{review.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Link
          className="ml-4 inline-flex items-center space-x-2"
          to="/{-$locale}/profile/$id"
          params={{ id: review.user.accountId }}
          search={{}}
        >
          <div className="font-bold">{review.user.displayName}</div>
          {review.verified && (
            <Badge variant="secondary">{t("offerDetail.reviews.verifiedOwner")}</Badge>
          )}
        </Link>
        <div className="ml-auto flex items-end space-x-2 bg-muted px-2 py-1 rounded-lg">
          <div className=" text-foreground px-2 py-1 rounded-lg font-bold">
            {review.rating} / 10
          </div>
          <div className="flex items-center space-x-1 font-bold">
            <span>
              {review.recommended
                ? t("offerDetail.reviews.recommended")
                : t("offerDetail.reviews.notRecommended")}
            </span>
            <ThumbsUpIcon
              className={cn(
                "p-[4px] size-8",
                review.recommended ? "fill-blue-600" : "fill-red-600 transform rotate-180",
              )}
              stroke="none"
            />
          </div>
        </div>
      </div>
      <div className="bg-muted p-4 rounded-lg h-full">
        <h3 className="font-bold mb-2 text-lg md:text-xl">{review.title}</h3>
        <div className="relative">
          <p className="mb-4 prose prose-sm md:prose-base prose-invert max-w-none min-w-1/2">
            {typeof review.content === "string" ? (
              <Markdown>
                {review.content.length <= 750
                  ? review.content
                  : `${review.content.slice(0, 750)}...`}
              </Markdown>
            ) : null}
            {typeof review.content === "object" ? <Viewer content={review.content} /> : null}
          </p>
          {review.content.length > 750 && (
            <div className="absolute bottom-0 left-0 w-full">
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-b via-background/50 from-transparent to-background pointer-events-none" />
              <Button
                variant="link"
                className="text-sm absolute z-10 -bottom-4 right-0 left-0 w-fit mx-auto inline-flex items-center gap-1 font-bold"
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
        <div className="mt-4 inline-flex justify-between items-center w-full">
          <TooltipProvider>
            <div className="flex items-center">
              <span className="text-muted-foreground">
                {t("offerDetail.reviews.reviewedOn")}{" "}
                {DateTime.fromISO(review.createdAt).setLocale("en-GB").toLocaleString({
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {review.editions?.length && review.editions.length > 0 ? (
                <Tooltip disableHoverableContent={!review.editions}>
                  <TooltipTrigger className="inline-flex items-center gap-1 ml-2">
                    <InfoCircledIcon className="size-4" fill="currentColor" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="text-xs flex flex-col gap-1">
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
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </TooltipProvider>
          {userId === review.userId && (
            <Button
              variant="outline"
              className="text-sm"
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
    </div>
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
    <div className="fixed inset-0 h-full w-full flex items-center justify-center bg-black bg-opacity-50 z-20">
      <span
        className="fixed inset-0 cursor-pointer"
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
      />
      <div className="p-2 bg-card text-foreground rounded-lg max-w-2xl mx-auto w-full z-30">
        <div className="w-full  p-4 rounded-lg">
          <div className="flex items-center mb-4">
            <Avatar>
              <AvatarImage src={userAvatar as string} alt={review.user.displayName} />
              <AvatarFallback>{review.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="ml-4 inline-flex items-center space-x-2">
              <div className="font-bold">{review.user.displayName}</div>
              {review.verified && (
                <Badge variant="secondary">{t("offerDetail.reviews.verifiedOwner")}</Badge>
              )}
            </div>
            <div className="ml-auto flex items-end space-x-2 bg-muted px-2 py-1 rounded-lg">
              <div className=" text-foreground px-2 py-1 rounded-lg font-bold">
                {review.rating} / 10
              </div>
              <div className="flex items-center space-x-1 font-bold">
                <span>
                  {review.recommended
                    ? t("offerDetail.reviews.recommended")
                    : t("offerDetail.reviews.notRecommended")}
                </span>
                <ThumbsUpIcon
                  className={cn(
                    "p-[4px] size-8",
                    review.recommended ? "fill-blue-600" : "fill-red-600 transform rotate-180",
                  )}
                  stroke="none"
                />
              </div>
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-bold mb-2">{review.title}</h3>
            <div className="relative">
              <ScrollArea className="h-[50vh]">
                <p className="mb-4 prose prose-sm prose-invert max-w-none mr-2">
                  {typeof review.content === "string" ? (
                    <Markdown>{review.content}</Markdown>
                  ) : (
                    <Viewer content={review.content} />
                  )}
                </p>
                <ScrollBar />
              </ScrollArea>
            </div>
          </div>
          <div className="mt-4 inline-flex justify-between items-center w-full">
            <span className="text-muted-foreground">
              {t("offerDetail.reviews.reviewedOn")}{" "}
              {DateTime.fromISO(review.createdAt).setLocale("en-GB").toLocaleString({
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <Button variant="outline" className="text-sm" onClick={() => setIsOpen(false)}>
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
    <div className="flex flex-col gap-2 relative">
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
        <div className="flex items-center gap-1 font-bold">
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
        <div className="flex items-center gap-1 font-bold">
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
      <div className="flex h-[4px] w-[300px] overflow-hidden rounded-full gap-1 relative">
        {/* biome-ignore lint/a11y/useFocusableInteractive: <explanation> */}
        <div
          className={cn(
            "bg-blue-600 rounded-full transition-all duration-300 ease-in-out cursor-pointer",
            hovered === "notRecommended" ? "bg-opacity-50" : "bg-opacity-100",
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
            hovered === "recommended" ? "bg-opacity-50" : "bg-opacity-100",
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
