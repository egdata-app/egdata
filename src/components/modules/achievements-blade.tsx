import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SingleOffer } from "@/types/single-offer";
import type { Achievement, AchievementSet } from "@/queries/offer-achievements";
import { useCountry } from "@/hooks/use-country";
import { getRarity } from "@/lib/get-rarity";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/getImage";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { FaTrophy } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { httpClient } from "@/lib/http-client";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { useTranslation } from "@/lib/paraglide-react";
import { localizeHref } from "@/lib/paraglide-strategy";

type OfferWithAchievements = SingleOffer & {
  achievements: AchievementSet;
};

const rarityColors = {
  bronze: "text-[#cd7f32]",
  silver: "text-[#c0c0c0]",
  gold: "text-[#ffd700]",
};

export function GamesWithAchievements() {
  const { t } = useTranslation();
  const { country } = useCountry();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: [
      "games-with-achievements",
      {
        country,
      },
    ],
    queryFn: () =>
      httpClient.get<OfferWithAchievements[]>("/offers/latest-achievements", {
        params: {
          country,
        },
      }),
  });

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <p>{t("components.achievementsBlade.noData")}</p>
      </div>
    );
  }

  return (
    <section className="w-full flex flex-col gap-4 my-4">
      <Link
        to={"/{-$locale}/search"}
        search={{
          tags: ["19847"],
          sortBy: "creationDate",
          offerType: "BASE_GAME",
        }}
        className="text-xl font-bold text-left inline-flex gap-2 group items-center justify-start"
      >
        {t("components.achievementsBlade.gamesWithAchievements")} 🏆
        <ArrowRightIcon className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
      </Link>
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>{t("components.achievementsBlade.game")}</TableHead>
            <TableHead className="text-center">
              {t("components.achievementsBlade.achievements")}
            </TableHead>
            <TableHead className="text-center">{t("components.achievementsBlade.xp")}</TableHead>
            <TableHead className="text-center">
              <span className="inline-flex items-center gap-2 justify-center">
                <FaTrophy className="size-3 text-[#cd7f32]" />
                <span>{t("components.achievementsBlade.bronze")}</span>
              </span>
            </TableHead>
            <TableHead className="text-center">
              <span className="inline-flex items-center gap-2 justify-center">
                <FaTrophy className="size-3 text-[#c0c0c0]" />
                <span>{t("components.achievementsBlade.silver")}</span>
              </span>
            </TableHead>
            <TableHead className="text-center">
              <span className="inline-flex items-center gap-2 justify-center">
                <FaTrophy className="size-3 text-[#ffd700]" />
                <span>{t("components.achievementsBlade.gold")}</span>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((game) => (
            <TableRow
              key={game.id}
              onClick={(event) => {
                if (event.ctrlKey || event.button === 1) {
                  window.open(localizeHref(`/offers/${game.id}`), "_blank");
                } else {
                  navigate({ to: "/{-$locale}/offers/$id", params: { id: game.id } });
                }
              }}
              className="cursor-pointer hover:bg-accent/50 transition-colors duration-200"
            >
              <TableCell className="inline-flex items-center gap-4">
                <span className="h-[40px] w-[75px]">
                  <Image
                    src={
                      getImage(game.keyImages, [
                        "DieselStoreFrontWide",
                        "Featured",
                        "OfferImageWide",
                      ])?.url ?? "/300x150-egdata-placeholder.png"
                    }
                    alt={game.title}
                    width={100}
                    height={50}
                    className="rounded-md w-full h-full object-cover"
                  />
                </span>
                <span>{game.title}</span>
              </TableCell>
              <TableCell className="text-center">{game.achievements.achievements.length}</TableCell>
              <TableCell className="text-center">
                {game.achievements.achievements.reduce((acc, ach) => acc + ach.xp, 0)}
              </TableCell>
              <NoOfAchievements achievements={game.achievements.achievements} rarity="bronze" />
              <NoOfAchievements achievements={game.achievements.achievements} rarity="silver" />
              <NoOfAchievements achievements={game.achievements.achievements} rarity="gold" />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function NoOfAchievements({
  achievements,
  rarity,
}: {
  achievements: Achievement[];
  rarity: keyof typeof rarityColors;
}) {
  return (
    <TableCell className={cn("text-center", rarityColors[rarity])}>
      {achievements.filter((ach) => getRarity(ach.xp) === rarity).length}
    </TableCell>
  );
}
