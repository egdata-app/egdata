import { createRootRouteWithContext, Link } from "@tanstack/react-router";
import { Outlet, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
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
import { LocaleProvider } from "@/providers/locale";
import { CookiesProvider } from "@/providers/cookies";
import { Base64Utils } from "@/lib/base-64";
import type { EpicToken } from "@/types/epic";
import type { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { Toaster } from "@/components/ui/sonner";
import "@/styles.css";
import { ExtensionProvider } from "@/providers/extension";
import { VideoProvider } from "@/providers/offers-video";
import { GlobalBackground } from "@/components/app/global-background";
import "../registerSW";
import type { CookiesSelection } from "@/contexts/cookies";
import { captureError } from "@/lib/pulse-telemetry";

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
      const { getCookies, getRequestHeaders, getRequestUrl } = await import("@/lib/start-server");
      const reqUrl = getRequestUrl();

      url = new URL(reqUrl);
      cookies = getCookies();

      // server session (headers carry auth)
      session = null;
      try {
        const { auth } = await import("@/lib/auth");
        const headers = getRequestHeaders();
        session = await auth.api.getSession({ headers });
      } catch (error) {
        console.error(
          "Failed to load SSR session. Continuing unauthenticated (check Better Auth server configuration if unexpected).",
          error,
        );
        captureError(error, {
          source: "root.beforeLoad.session",
        });
        session = null;
      }
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
        queryFn: () => getUserInformation(id).catch(() => null),
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
        href: "https://cdn.egdata.app/fonts/sora/Sora-VariableFont_wght.ttf",
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
    scripts: import.meta.env.DEV
      ? []
      : [
          {
            src: "https://analytics.egdata.app/script.js",
            async: true,
            "data-website-id": "931f85f9-f8b6-422c-882d-04864194435b",
          } as any,
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
      <VideoProvider>
        <GlobalBackground />
        <Outlet />
      </VideoProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { country, locale, timezone, analyticsCookies } = Route.useLoaderData() as Context;

  useEffect(() => {
    void import("@/lib/pulse-telemetry/browser")
      .then(({ initPulseBrowserTelemetry }) => {
        initPulseBrowserTelemetry();
      })
      .catch((error: unknown) => {
        console.error("Failed to initialize Pulse telemetry", error);
      });
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <GlobalBackground />
        <div className="md:container relative z-[1] mx-auto overflow-x-hidden">
          <LocaleProvider initialLocale={locale} initialTimezone={timezone}>
            <CountryProvider defaultCountry={country || "US"}>
              <CompareProvider>
                <SearchProvider>
                  <Navbar />
                  <div className="pt-6">
                    <PreferencesProvider>
                      <CookiesProvider
                        initialSelection={analyticsCookies as unknown as CookiesSelection}
                      >
                        <ExtensionProvider>{children}</ExtensionProvider>
                      </CookiesProvider>
                    </PreferencesProvider>
                  </div>
                  <Toaster />
                  <footer className="mt-12 border-t border-border/40">
                    <div
                      className="h-px w-full"
                      style={{
                        background:
                          "linear-gradient(to right, transparent, hsl(199 100% 50% / 0.28), transparent)",
                      }}
                    />
                    <div className="py-8 px-4 md:px-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 max-w-5xl mx-auto">
                        <div className="space-y-2">
                          <Link to="/" className="flex items-center gap-2">
                            <img
                              src="https://cdn.egdata.app/logo_simple_white_clean.png"
                              alt="EGDATA Logo"
                              width={28}
                              height={28}
                            />
                            <span className="text-base font-display font-bold tracking-tight text-foreground">
                              EGDATA
                            </span>
                          </Link>
                          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                            A fan-made Epic Games Store database. Not affiliated with Epic Games,
                            Inc. All logos, images, and trademarks belong to their respective
                            owners.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-3 text-sm">
                          <div className="space-y-2">
                            <h4 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-display">
                              Legal
                            </h4>
                            <Link
                              to="/privacy"
                              className="block text-muted-foreground hover:text-primary transition-colors"
                            >
                              Privacy Policy
                            </Link>
                            <Link
                              to="/notifications"
                              className="block text-muted-foreground hover:text-primary transition-colors"
                            >
                              Notifications
                            </Link>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-display">
                              Resources
                            </h4>
                            <a
                              href="https://docs.egdata.app"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-muted-foreground hover:text-primary transition-colors"
                            >
                              API Docs
                            </a>
                            <Link
                              to="/changelog"
                              className="block text-muted-foreground hover:text-primary transition-colors"
                            >
                              Changelog
                            </Link>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-display">
                              Community
                            </h4>
                            <a
                              href="https://flagpedia.net"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-muted-foreground hover:text-primary transition-colors"
                            >
                              Flags by Flagpedia
                            </a>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              Made in{" "}
                              <img
                                src="https://flagcdn.com/16x12/eu.webp"
                                alt="EU Flag"
                                className="inline"
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </footer>
                </SearchProvider>
              </CompareProvider>
            </CountryProvider>
          </LocaleProvider>
        </div>

        {import.meta.env.DEV ? (
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
        ) : null}
        <Scripts />
      </body>
    </html>
  );
}
