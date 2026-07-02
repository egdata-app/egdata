import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/fair-use")({
  component: () => {
    const { t } = useTranslation();
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">{t("misc.fairUse.title")}</h1>

        <h2 className="text-2xl font-semibold mb-2">{t("misc.fairUse.section1Title")}</h2>
        <p className="mb-4">
          {t("misc.fairUse.section1Body", {
            siteLink: "https://egdata.app",
          })}{" "}
          <a href="https://egdata.app" className="text-blue-500">
            https://egdata.app
          </a>{" "}
          (the &quot;Site&quot;).
        </p>

        <h2 className="text-2xl font-semibold mb-2">{t("misc.fairUse.section2Title")}</h2>
        <p className="mb-4">{t("misc.fairUse.section2Body")}</p>

        <h2 className="text-2xl font-semibold mb-2">{t("misc.fairUse.section3Title")}</h2>
        <p className="mb-4">{t("misc.fairUse.section3Body")}</p>
        <ul className="list-disc list-inside mb-4">
          <li>
            <strong>{t("misc.fairUse.section3List.purpose")}</strong>{" "}
            {t("misc.fairUse.section3List.purposeBody")}
          </li>
          <li>
            <strong>{t("misc.fairUse.section3List.nature")}</strong>{" "}
            {t("misc.fairUse.section3List.natureBody")}
          </li>
          <li>
            <strong>{t("misc.fairUse.section3List.amount")}</strong>{" "}
            {t("misc.fairUse.section3List.amountBody")}
          </li>
          <li>
            <strong>{t("misc.fairUse.section3List.effect")}</strong>{" "}
            {t("misc.fairUse.section3List.effectBody")}
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-2">{t("misc.fairUse.section4Title")}</h2>
        <p className="mb-4">{t("misc.fairUse.section4Body1")}</p>
        <p className="mb-4">{t("misc.fairUse.section4Body2")}</p>
        <p className="mb-4">{t("misc.fairUse.section4Body3")}</p>

        <h2 className="text-2xl font-semibold mb-2">{t("misc.fairUse.section5Title")}</h2>
        <p className="mb-4">{t("misc.fairUse.section5Body1")}</p>
        <p className="mb-4">{t("misc.fairUse.section5Body2")}</p>
        <p className="mb-4">{t("misc.fairUse.section5Body3")}</p>
        <ul className="list-disc list-inside mb-4">
          <li>
            <a
              href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0790"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500"
            >
              {t("misc.fairUse.euDirective1")}
            </a>
          </li>
          <li>
            <a
              href="https://ec.europa.eu/commission/presscorner/detail/en/QANDA_21_2821"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500"
            >
              {t("misc.fairUse.euDirective2")}
            </a>
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-2">{t("misc.fairUse.section6Title")}</h2>
        <p className="mb-4">{t("misc.fairUse.section6Body")}</p>
        <p className="mb-4">
          {t("misc.fairUse.email")}{" "}
          <a href="mailto:fairuse@egdata.app" className="text-blue-500">
            fairuse@egdata.app
          </a>
        </p>
      </div>
    );
  },

  head: () => {
    return {
      meta: [
        {
          title: i18n.t("misc.fairUse.meta.title"),
          description: i18n.t("misc.fairUse.meta.description"),
        },
      ],
    };
  },
});
