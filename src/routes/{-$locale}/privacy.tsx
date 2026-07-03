import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/privacy")({
  component: () => {
    const { t } = useTranslation();
    return (
      <div className="flex flex-col items-start justify-start w-full min-h-screen gap-4 mt-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl font-thin">{t("privacy.title")}</h1>
          <p className="mb-4">{t("privacy.intro")}</p>

          <h2 className="text-2xl font-bold mb-2">{t("privacy.missionTitle")}</h2>
          <p className="mb-4">{t("privacy.missionBody")}</p>

          <h2 className="text-2xl font-bold mb-2">{t("privacy.featuresTitle")}</h2>
          <ul className="list-disc list-inside mb-4">
            <li>{t("privacy.features.trackPrices")}</li>
            <li>{t("privacy.features.upcomingReleases")}</li>
            <li>{t("privacy.features.gameDetails")}</li>
            <li>{t("privacy.features.analyzeTrends")}</li>
          </ul>

          <h2 className="text-2xl font-bold mb-2">{t("privacy.communityTitle")}</h2>
          <p className="mb-2">{t("privacy.communityBody")}</p>
          <p className="mb-4">
            {t("privacy.sourceCodeIntro")}{" "}
            <a
              className="text-blue-500"
              href="https://github.com/nachoaldamav/egdata"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("privacy.github")}
            </a>
            .
          </p>

          <h2 className="text-2xl font-bold mb-2">{t("privacy.notTitle")}</h2>
          <p className="mb-4">{t("privacy.notIntro")}</p>
          <ul className="list-disc list-inside mb-4">
            <li>{t("privacy.notList.affiliated")}</li>
            <li>{t("privacy.notList.storefront")}</li>
            <li>{t("privacy.notList.piracy")}</li>
          </ul>

          <h2 className="text-2xl font-bold mb-2">{t("privacy.fairUseTitle")}</h2>
          <p className="mb-4">{t("privacy.fairUseBody")}</p>

          <h3 className="text-xl font-semibold mb-2">{t("privacy.fairUseFactorsTitle")}</h3>
          <ul className="list-disc list-inside mb-4">
            <li>
              <strong>{t("privacy.fairUseFactors.nonCommercial")}</strong>{" "}
              {t("privacy.fairUseFactors.nonCommercialBody")}
            </li>
            <li>
              <strong>{t("privacy.fairUseFactors.factual")}</strong>{" "}
              {t("privacy.fairUseFactors.factualBody")}
            </li>
            <li>
              <strong>{t("privacy.fairUseFactors.limited")}</strong>{" "}
              {t("privacy.fairUseFactors.limitedBody")}
            </li>
            <li>
              <strong>{t("privacy.fairUseFactors.noMarketHarm")}</strong>{" "}
              {t("privacy.fairUseFactors.noMarketHarmBody")}
            </li>
          </ul>

          <p className="mb-4">{t("privacy.autoTrackBody")}</p>

          <h3 className="text-xl font-semibold mb-2">{t("privacy.leakedDataTitle")}</h3>
          <p className="mb-4">
            {t("privacy.leakedDataBody")}{" "}
            <a
              href="https://dev.epicgames.com/portal/en-US"
              className="text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("privacy.epicDevPortal")}
            </a>
            .
          </p>
          <p className="mb-4">{t("privacy.euDirectivesIntro")}</p>
          <ul className="list-disc list-inside mb-4">
            <li>
              <a
                href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0790"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                {t("privacy.euDirective1")}
              </a>
            </li>
            <li>
              <a
                href="https://ec.europa.eu/commission/presscorner/detail/en/QANDA_21_2821"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                {t("privacy.euDirective2")}
              </a>
            </li>
          </ul>

          <p className="mb-4">
            {t("privacy.fairUseContact")}{" "}
            <a href="mailto:fairuse@egdata.app" className="text-blue-500">
              fairuse@egdata.app
            </a>
          </p>

          <h2 className="text-2xl font-bold mb-2">{t("privacy.contactTitle")}</h2>
          <p className="mb-4">
            {t("privacy.contactBody")}{" "}
            <a className="text-blue-500" href="mailto:contact@egdata.app">
              contact@egdata.app
            </a>
            .
          </p>
        </div>
      </div>
    );
  },
});
