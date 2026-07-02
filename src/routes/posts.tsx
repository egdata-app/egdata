import { Image } from "@/components/app/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/posts")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Image
        src="https://tse3.mm.bing.net/th?id=OIF.Hc43sii5eliKbenwW2%2FaSA&pid=Api"
        alt={t("misc.posts.coverAlt")}
        width={1200}
        height={675}
        className="rounded-lg object-cover w-full aspect-video mb-8"
      />
      <h1 className="text-4xl font-bold my-4">{t("misc.posts.title")}</h1>
      <div className="flex items-center mb-6 space-x-4">
        <Badge variant="secondary">{t("misc.posts.freeGameBadge")}</Badge>
        <p className="text-sm text-muted-foreground">{t("misc.posts.published")}</p>
      </div>
      <div className="prose prose-lg prose-invert max-w-none">
        <p className="font-bold">
          {t("misc.posts.intro", {
            dateRange: t("misc.posts.dateRange"),
            game: t("misc.posts.game"),
            price: t("misc.posts.price"),
            saga: t("misc.posts.saga"),
          })}
        </p>

        <Image
          src="https://tse3.mm.bing.net/th?id=OIF.Hc43sii5eliKbenwW2%2FaSA&pid=Api"
          alt={t("misc.posts.coverAlt")}
          width={800}
          height={450}
          className="rounded-lg object-cover w-full aspect-video my-8"
        />

        <h2>{t("misc.posts.whatToExpect")}</h2>
        <p>
          {t("misc.posts.whatToExpectBody", {
            developer: t("misc.posts.developer"),
            publisher: t("misc.posts.publisher"),
          })}
        </p>
        <ul>
          <li>
            {t("misc.posts.expectList.allMovies", {
              strong: t("misc.posts.expectList.allMoviesStrong"),
            })}
          </li>
          <li>
            {t("misc.posts.expectList.characters", {
              strong: t("misc.posts.expectList.charactersStrong"),
            })}
          </li>
          <li>
            {t("misc.posts.expectList.vehicles", {
              strong: t("misc.posts.expectList.vehiclesStrong"),
            })}
          </li>
          <li>
            {t("misc.posts.expectList.planets", {
              strong: t("misc.posts.expectList.planetsStrong"),
            })}
          </li>
        </ul>

        <Image
          src="https://tse4.mm.bing.net/th?id=OIF.GV3NuTTw5%2B81NNXn6xosgA&pid=Api"
          alt={t("misc.posts.gameplayAlt")}
          width={800}
          height={450}
          className="rounded-lg object-cover w-full aspect-video my-8"
        />

        <h2>{t("misc.posts.specialTitle")}</h2>
        <p>
          {t("misc.posts.specialBody", {
            releaseDate: t("misc.posts.releaseDate"),
            metascore: t("misc.posts.metascore"),
          })}
        </p>
        <ul>
          <li>
            {t("misc.posts.specialList.combat", {
              strong: t("misc.posts.specialList.combatStrong"),
            })}
          </li>
          <li>
            {t("misc.posts.specialList.charm", {
              strong: t("misc.posts.specialList.charmStrong"),
            })}
          </li>
          <li>
            {t("misc.posts.specialList.replayability", {
              strong: t("misc.posts.specialList.replayabilityStrong"),
            })}
          </li>
        </ul>

        <Image
          src="https://tse3.mm.bing.net/th?id=OIF.lT4bZyWzcKW%2FVGY9Jlk52Q&pid=Api"
          alt={t("misc.posts.charactersAlt")}
          width={800}
          height={450}
          className="rounded-lg object-cover w-full aspect-video my-8"
        />

        <h2>{t("misc.posts.howToClaim")}</h2>
        <p>{t("misc.posts.howToClaimBody")}</p>
        <ol>
          <li>
            {t("misc.posts.step1", {
              storeLink: t("misc.posts.storeLink"),
              dec5: t("misc.posts.dec5"),
              dec12: t("misc.posts.dec12"),
            })}
          </li>
          <li>{t("misc.posts.step2")}</li>
          <li>{t("misc.posts.step3")}</li>
        </ol>

        <Card className="my-8">
          <CardContent className="p-6">
            <p className="text-lg font-semibold mb-2">{t("misc.posts.cardTitle")}</p>
            <p>{t("misc.posts.cardBody")}</p>
          </CardContent>
        </Card>

        <p className="text-center text-xl font-bold">{t("misc.posts.footer")}</p>
      </div>
    </article>
  );
}
