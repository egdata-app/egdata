/// <reference types="vite/client" />
import { createRootRouteWithContext, Link } from "@tanstack/react-router";
import { Outlet, HeadContent, Scripts } from "@tanstack/react-router";
import type * as React from "react";
import Navbar from "@/components/app/navbar";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { CountryProvider } from "@/providers/country";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import getCountryCode from "@/lib/get-country-code";
import { parseCookieString } from "@/lib/parse-cookies";
import { SearchProvider } from "@/providers/global-search";
import { getUserInformation } from "@/queries/profiles";
import { PreferencesProvider } from "@/providers/preferences";
import { CompareProvider } from "@/providers/compare";
import { ComparisonPortal } from "@/components/app/comparison-portal";
import { LocaleProvider } from "@/providers/locale";
import { CookiesProvider } from "@/providers/cookies";
import { Base64Utils } from "@/lib/base-64";
import type { EpicToken } from "@/types/epic";
import type { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { Toaster } from "@/components/ui/sonner";
import styles from "@/styles.css?url";
import { ExtensionProvider } from "@/providers/extension";
import "../registerSW";
import type { CookiesSelection } from "@/contexts/cookies";

const getClientSession = queryOptions({
  queryKey: ["session"],
  queryFn: () => authClient.getSession(),
  staleTime: 5_000,
});

type Context = {
  queryClient: QueryClient;
  cookies?: Record<string, string>;
  epicToken?: EpicToken | null;
  country?: string;
  session?:
    | {
        session: typeof auth.$Infer.Session.session;
        user: typeof auth.$Infer.Session.user;
      }
    | null
    | undefined;
  locale?: string;
  timezone?: string;
  analyticsCookies?: Record<string, string> | null;
};

export const Route = createRootRouteWithContext<Context>()({
  component: RootComponent,

  loader: ({ context }) => {
    return {
      country: context.country,
      locale: context.locale,
      timezone: context.timezone,
      analyticsCookies: context.analyticsCookies,
      cookies: context.cookies,
      session: context.session,
    };
  },

  // @ts-expect-error - loader return type
  beforeLoad: async ({ context }) => {
    const { queryClient } = context;

    let url: URL;
    let cookies: Record<string, string>;
    let session: {
      session: typeof auth.$Infer.Session.session;
      user: typeof auth.$Infer.Session.user;
    } | null;

    if (import.meta.env.SSR) {
      const { getCookies, getRequestHeaders, getRequestUrl } =
        await import("@tanstack/react-start/server");
      const { auth } = await import("@/lib/auth");
      const reqUrl = getRequestUrl();

      url = new URL(reqUrl);
      cookies = getCookies();

      // server session (headers carry auth)
      const headers = getRequestHeaders();
      session = await auth.api.getSession({ headers });
    } else {
      url = new URL(window.location.href);

      // client cookies
      const cookieHeader = typeof document?.cookie === "string" ? document.cookie : "";
      const parsedCookies = parseCookieString(cookieHeader);
      cookies = Object.fromEntries(Object.entries(parsedCookies).map(([k, v]) => [k, v || ""]));

      // client session via React Query
      const { data } = await queryClient.fetchQuery(getClientSession);
      session = data;
    }

    // derived values from cookies/url
    const country = getCountryCode(url, cookies);
    const locale = cookies.user_locale;
    const timezone = cookies.user_timezone;
    const analyticsCookies = cookies.EGDATA_COOKIES_2
      ? JSON.parse(Base64Utils.decode(cookies.EGDATA_COOKIES_2))
      : null;

    // warm user cache if we know the email
    if (session?.user?.email) {
      const id = session.user.email.split("@")[0];
      await queryClient.prefetchQuery({
        queryKey: ["user", { id }],
        queryFn: () => getUserInformation(id),
      });
    }

    return {
      country,
      locale,
      timezone,
      analyticsCookies,
      cookies,
      session,
    };
  },

  notFoundComponent() {
    return <NotFoundPage />;
  },

  head: () => ({
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "preconnect", href: "https://cdn1.epicgames.com/" },
      { rel: "preconnect", href: "https://api.egdata.app/" },
      { rel: "preconnect", href: "https://cdn.egdata.app/" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#5bbad5" },
      {
        rel: "preload",
        href: "https://cdn.egdata.app/Nunito/Nunito-VariableFont_wght.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "https://cdn.egdata.app/Montserrat/Montserrat-VariableFont_wght.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      },
    ],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Epic Games Database - egdata.app" },
      {
        name: "description",
        content:
          "Comprehensive Epic Games Store database: game info, prices, sales history, file lists, and more. Explore free games, upcoming releases, and community insights.",
      },
      {
        name: "keywords",
        content: [
          "Epic Games Store",
          "EGS",
          "Epic Games Database",
          "EGS Database",
          "game prices",
          "game sales",
          "discounts",
          "player count",
          "game size",
          "system requirements",
          "release date",
          "free games",
          "upcoming releases",
          "game files",
          "file list",
          "game assets",
          "historical data",
          "price tracker",
          "EGS tracker",
          "PC games",
          "data mining",
          "Epic Games API",
          "egdata",
          "egstore",
          "eos",
        ].join(", "),
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@egdataapp" },
      { name: "twitter:title", content: "Epic Games Database" },
      {
        name: "twitter:description",
        content:
          "A free and open-source Epic Games Store database with comprehensive game information, sales tracking, and more. Community-driven and constantly updated.",
      },
      {
        name: "twitter:image",
        content: "https://cdn.egdata.app/placeholder-1080.webp",
      },
      { name: "twitter:image:alt", content: "Epic Games Database" },
      { name: "og:title", content: "Epic Games Database" },
      { name: "og:type", content: "website" },
      { name: "og:url", content: "https://egdata.app" },
      {
        name: "og:image",
        content: "https://cdn.egdata.app/placeholder-1080.webp",
      },
      { name: "og:image:alt", content: "Epic Games Database" },
      {
        name: "og:description",
        content:
          "A free and open-source Epic Games Store database with comprehensive game information, sales tracking, and more. Community-driven and constantly updated.",
      },
    ],
    scripts: [
      ...(import.meta.env.DEV
        ? []
        : [
            {
              src: "https://analytics.egdata.app/script.js",
              async: true,
              "data-website-id": "931f85f9-f8b6-422c-882d-04864194435b",
            } as any,
          ]),
      {
        src: "https://insights.egdata.app/tracker.js",
        defer: true,
      },
    ],
  }),
});

function NotFoundPage() {
  return (
    <div className="w-full h-full flex flex-col items-start justify-center">
      <h2>Page not found</h2>
    </div>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  const { country, locale, timezone, analyticsCookies } = Route.useLoaderData() as Context;

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <div className="md:container mx-auto overflow-x-hidden">
          <LocaleProvider initialLocale={locale} initialTimezone={timezone}>
            <CountryProvider defaultCountry={country || "US"}>
              <CompareProvider>
                <SearchProvider>
                  <Navbar />
                  <PreferencesProvider>
                    <CookiesProvider
                      initialSelection={analyticsCookies as unknown as CookiesSelection}
                    >
                      <ExtensionProvider>{children}</ExtensionProvider>
                    </CookiesProvider>
                  </PreferencesProvider>
                  <ComparisonPortal />
                  <Toaster />
                  <footer className="flex flex-col items-center justify-center p-4 text-gray-500 dark:text-gray-400 text-xs gap-1">
                    <p>
                      egdata.app is a fan-made website and is not affiliated by any means with Epic
                      Games, Inc.
                    </p>
                    <p>
                      All the logos, images, trademarks and creatives are property of their
                      respective owners.
                    </p>
                    <hr className="w-1/3 my-2 border-gray-300/40" />
                    <div className="inline-flex gap-2">
                      <span>
                        Countries flags by{" "}
                        <a href="https://flagpedia.net" target="_blank" rel="noopener noreferrer">
                          <strong>Flagpedia</strong>
                        </a>
                      </span>
                      <span>|</span>
                      <span className="inline-flex gap-1 items-center">
                        Made in <img src="https://flagcdn.com/16x12/eu.webp" alt="EU Flag" />
                      </span>
                      <span>|</span>
                      <Link to="/privacy">Privacy Policy</Link>
                      <span>|</span>
                      <Link to="/notifications">Notifications</Link>
                    </div>
                  </footer>
                </SearchProvider>
              </CompareProvider>
            </CountryProvider>
          </LocaleProvider>
        </div>

        {import.meta.env.DEV && (
          <TanStackDevtools
            plugins={[
              {
                name: "Tanstack Query",
                render: <ReactQueryDevtoolsPanel />,
              },
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
