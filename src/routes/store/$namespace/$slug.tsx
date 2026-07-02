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
import { useTranslation } from "react-i18next";

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
    const creatorCodePref = context.cookies?.[CREATOR_CODE_COOKIE];

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
  const { t } = useTranslation();
  const { namespace, slug } = Route.useParams();
  const { ns } = Route.useSearch();

  const handleChoice = (useCode: boolean) => {
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
      <Card className="bg-card text-foreground border-border/60">
        <CardHeader>
          <CardTitle className="text-2xl">{t("store.creatorCode.title")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("store.creatorCode.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-muted-foreground">
            <EGSIcon className="size-8" />
            <p>{t("store.creatorCode.body")}</p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button
            variant="outline"
            className="bg-muted text-foreground hover:bg-muted/80 border-zinc-700"
            onClick={() => handleChoice(false)}
          >
            {t("store.creatorCode.noThanks")}
          </Button>
          <Button onClick={() => handleChoice(true)}>{t("store.creatorCode.yesUseCode")}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
