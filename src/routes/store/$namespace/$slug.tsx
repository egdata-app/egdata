import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EGSIcon } from "@/components/icons/egs";
import { z } from "zod";

const RedirectSchema = z.object({
  ns: z.string(),
  id: z.string(),
});

const CREATOR_CODE = "ac7b3a70e3ce4652b49c38e648001d9e";
const CREATOR_CODE_COOKIE = "egdata_creator_code";

export const Route = createFileRoute("/store/$namespace/$slug")({
  component: CreatorCodePage,

  beforeLoad: ({ search, params, context }) => {
    const { namespace, slug } = params;
    const creatorCodePref = context.cookies[CREATOR_CODE_COOKIE];

    // If we have a preference, redirect immediately
    if (creatorCodePref !== undefined) {
      const url = new URL(`https://store.epicgames.com/${namespace}/${slug}`);
      url.searchParams.set("utm_source", "egdata.app");

      if (creatorCodePref === "true") {
        url.searchParams.set("epic_creator_id", CREATOR_CODE);
        url.searchParams.set("epic_game_id", search.ns);
      }

      throw redirect({
        href: url.toString(),
      });
    }

    return { namespace, slug };
  },

  validateSearch: RedirectSchema,
});

function CreatorCodePage() {
  const { namespace, slug } = Route.useParams();
  const { ns } = Route.useSearch();

  const handleChoice = (useCode: boolean) => {
    // Set cookie for 1 year if true, 30 days if false
    document.cookie = `${CREATOR_CODE_COOKIE}=${useCode}; max-age=${useCode ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 30}; path=/`;

    const url = new URL(`https://store.epicgames.com/${namespace}/${slug}`);
    url.searchParams.set("utm_source", "egdata.app");

    if (useCode) {
      url.searchParams.set("epic_creator_id", CREATOR_CODE);
      url.searchParams.set("epic_game_id", ns);
    }

    window.location.href = url.toString();
  };

  return (
    <div className="container max-w-2xl py-12">
      <Card className="bg-zinc-900 text-white border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl">Support egdata.app</CardTitle>
          <CardDescription className="text-zinc-400">
            Would you like to support egdata.app by using our creator code when purchasing games?
            This choice will be remembered for future visits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-zinc-400">
            <EGSIcon className="size-8" />
            <p>
              Using our creator code helps support the development of egdata.app and its features.
              It doesn't affect the price you pay.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button
            variant="outline"
            className="bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700"
            onClick={() => handleChoice(false)}
          >
            No thanks
          </Button>
          <Button
            className="bg-white text-zinc-900 hover:bg-zinc-100"
            onClick={() => handleChoice(true)}
          >
            Yes, use code
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
