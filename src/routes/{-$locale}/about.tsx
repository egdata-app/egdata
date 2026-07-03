import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/about")({
  component: () => {
    const { t } = useTranslation();
    return (
      <main className="flex flex-col items-start justify-start w-full min-h-screen gap-4 mt-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl font-thin">{t("about.title")}</h1>
          <p className="mb-4">{t("about.intro")}</p>

          <h2 className="text-2xl font-bold mb-2">{t("about.missionTitle")}</h2>
          <p className="mb-4">{t("about.missionBody")}</p>

          <h2 className="text-2xl font-bold mb-2">{t("about.featuresTitle")}</h2>
          <ul className="list-disc list-inside mb-4">
            <li>{t("about.features.trackPrices")}</li>
            <li>{t("about.features.upcomingReleases")}</li>
            <li>{t("about.features.gameDetails")}</li>
            <li>{t("about.features.analyzeTrends")}</li>
          </ul>

          <h2 className="text-2xl font-bold mb-2">{t("about.communityTitle")}</h2>
          <p className="mb-2">{t("about.communityBody")}</p>
          <p className="mb-4">
            {t("about.sourceCodeIntro")}{" "}
            <a className="text-blue-500" href="https://github.com/nachoaldamav/egdata">
              {t("about.github")}
            </a>
            .
          </p>

          <h2 className="text-2xl font-bold mb-2">{t("about.notTitle")}</h2>
          <p className="mb-4">{t("about.notIntro")}</p>
          <ul className="list-disc list-inside mb-4">
            <li>{t("about.notList.affiliated")}</li>
            <li>{t("about.notList.storefront")}</li>
            <li>{t("about.notList.piracy")}</li>
          </ul>

          <h2 className="text-2xl font-bold mb-2">{t("about.fairUseTitle")}</h2>
          <p className="mb-4">{t("about.fairUseBody")}</p>

          <h3 className="text-xl font-semibold mb-2">{t("about.fairUseFactorsTitle")}</h3>
          <ul className="list-disc list-inside mb-4">
            <li>
              <strong>{t("about.fairUseFactors.nonCommercial")}</strong>{" "}
              {t("about.fairUseFactors.nonCommercialBody")}
            </li>
            <li>
              <strong>{t("about.fairUseFactors.factual")}</strong>{" "}
              {t("about.fairUseFactors.factualBody")}
            </li>
            <li>
              <strong>{t("about.fairUseFactors.limited")}</strong>{" "}
              {t("about.fairUseFactors.limitedBody")}
            </li>
            <li>
              <strong>{t("about.fairUseFactors.noMarketHarm")}</strong>{" "}
              {t("about.fairUseFactors.noMarketHarmBody")}
            </li>
          </ul>

          <p className="mb-4">{t("about.autoTrackBody")}</p>

          <h3 className="text-xl font-semibold mb-2">{t("about.leakedDataTitle")}</h3>
          <p className="mb-4">
            {t("about.leakedDataBody")}{" "}
            <a
              href="https://dev.epicgames.com/portal/en-US"
              className="text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("about.epicDevPortal")}
            </a>
            .
          </p>
          <p className="mb-4">{t("about.euDirectivesIntro")}</p>
          <ul className="list-disc list-inside mb-4">
            <li>
              <a
                href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0790"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                {t("about.euDirective1")}
              </a>
            </li>
            <li>
              <a
                href="https://ec.europa.eu/commission/presscorner/detail/en/QANDA_21_2821"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                {t("about.euDirective2")}
              </a>
            </li>
          </ul>

          <p className="mb-4">
            {t("about.fairUseContact")}{" "}
            <a href="mailto:fairuse@egdata.app" className="text-blue-500">
              fairuse@egdata.app
            </a>
          </p>

          <h2 className="text-2xl font-bold mb-2">{t("about.contactTitle")}</h2>
          <p className="mb-4">
            {t("about.contactBody")}{" "}
            <a className="text-blue-500" href="mailto:contact@egdata.app">
              contact@egdata.app
            </a>
            .
          </p>
        </div>
      </main>
    );
  },

  head: () => {
    return {
      meta: [
        {
          title: i18n.t("about.meta.title"),
          description: i18n.t("about.meta.description"),
        },
      ],
    };
  },
});
