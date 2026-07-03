import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { changeLanguage } from "@/lib/i18n";
import { isSupportedLocale } from "@/lib/supported-locales";

export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: async ({ params }) => {
    if (params.locale && !isSupportedLocale(params.locale)) {
      throw notFound();
    }

    if (params.locale) {
      await changeLanguage(params.locale);
    }

    return {
      locale: params.locale,
    };
  },
  component: Outlet,
});
