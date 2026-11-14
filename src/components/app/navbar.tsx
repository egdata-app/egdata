import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import React, { useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavigationMenu } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { getImage } from "@/lib/get-image";
import { getTopSection } from "@/queries/top-section";
import { CountriesSelector } from "./countries-selector";
import { LocaleSelector } from "./locale-selector";
import { useSearch } from "@/hooks/use-search";
import { getRouteApi } from "@tanstack/react-router";
import { getUserInformation } from "@/queries/profiles";
import { ComparisonPortal } from "./comparison-portal";
import { DiscordBotPopover } from "./discord-bot";
import { authClient } from "@/lib/auth-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TrendingUpIcon,
  UsersIcon,
  BarChart3Icon,
  TagIcon,
  GiftIcon,
  StarIcon,
  CalendarCheck2Icon,
  CompassIcon,
  LayoutGridIcon,
  HistoryIcon,
  InfoIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  LogInIcon,
} from "lucide-react";
import { httpClient } from "@/lib/http-client";
import { useTranslation } from "@/lib/paraglide-react";
import type { GenreResponse } from "@/routes/{-$locale}/genres";
import { Separator } from "../ui/separator";

const mobileRowClass =
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/60 hover:text-foreground";

const mobileGroupHeadingClass =
  "px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

interface MobileNavLinkProps {
  to: string;
  params?: Record<string, unknown>;
  search?: Record<string, unknown>;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  subtle?: boolean;
}

function MobileNavLink({ to, params, search, icon: Icon, label, subtle }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      className={cn(mobileRowClass, subtle && "py-2 text-foreground/60")}
      activeProps={{ className: "bg-accent/60 text-foreground" }}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function MobileSeeAllLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="block rounded-md px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-accent/60"
    >
      {label}
    </Link>
  );
}

function MobileExploreMenu() {
  const { t } = useTranslation();
  const { data: genres, isLoading } = useQuery({
    queryKey: ["genres-list"],
    queryFn: () => httpClient.get<GenreResponse[]>("/offers/genres"),
  });

  return (
    <div className="pb-2">
      <h4 className={mobileGroupHeadingClass}>{t("nav.rankings")}</h4>
      <MobileNavLink
        to="/{-$locale}/collections/$id"
        params={{ id: "top-sellers" }}
        icon={TrendingUpIcon}
        label={t("nav.topSellers")}
        subtle
      />
      <MobileNavLink
        to="/{-$locale}/collections/$id"
        params={{ id: "most-played" }}
        icon={UsersIcon}
        label={t("nav.mostPlayed")}
        subtle
      />
      <MobileNavLink
        to="/{-$locale}/collections/$id"
        params={{ id: "top-wishlisted" }}
        icon={StarIcon}
        label={t("nav.topWishlisted")}
        subtle
      />
      <MobileNavLink
        to="/{-$locale}/collections/$id"
        params={{ id: "top-new-releases" }}
        icon={CalendarCheck2Icon}
        label={t("nav.topNewReleases")}
        subtle
      />
      <MobileSeeAllLink to="/{-$locale}/collections" label={t("nav.seeAllCollections")} />

      <h4 className={mobileGroupHeadingClass}>{t("nav.genres")}</h4>
      {isLoading && (
        <p className="px-3 py-2 text-sm text-muted-foreground">{t("common.loading")}</p>
      )}
      {genres?.slice(0, 6).map((genre) => (
        <MobileNavLink
          key={genre.genre.id}
          to="/{-$locale}/search"
          search={{ tags: [genre.genre.id] }}
          label={genre.genre.name}
          subtle
        />
      ))}
      <MobileSeeAllLink to="/{-$locale}/genres" label={t("nav.seeAllGenres")} />

      <h4 className={mobileGroupHeadingClass}>{t("nav.others")}</h4>
      <MobileNavLink
        to="/{-$locale}/stats/releases"
        icon={BarChart3Icon}
        label={t("nav.releaseStats")}
        subtle
      />
    </div>
  );
}

type NavRouteKey = "nav.explore" | "nav.browse" | "nav.sales" | "nav.changelog" | "nav.about";

type Route = {
  nameKey: NavRouteKey;
  href?: string;
  icon?: string;
  component?: () => React.ReactNode;
};

const ExploreMenu = () => {
  const { t } = useTranslation();
  const { data: genres, isLoading } = useQuery({
    queryKey: ["genres-list"],
    queryFn: () => httpClient.get<GenreResponse[]>("/offers/genres"),
  });

  return (
    <div className="grid grid-cols-2 gap-2 p-6 w-[600px]">
      {/* Rankings + Others Column */}
      <div className="border-r pr-8">
        <h4 className="text-xs font-semibold text-muted-foreground mb-4 tracking-wider uppercase">
          {t("nav.rankings")}
        </h4>
        <ul className="space-y-1 list-none">
          {/* Rankings */}
          <li>
            <Link
              to="/{-$locale}/collections/$id"
              params={{ id: "top-sellers" }}
              className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-sm font-medium outline-none"
            >
              <TrendingUpIcon className="w-4 h-4 text-muted-foreground" />
              {t("nav.topSellers")}
            </Link>
          </li>
          <li>
            <Link
              to="/{-$locale}/collections/$id"
              params={{ id: "most-played" }}
              className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-sm font-medium outline-none"
            >
              <UsersIcon className="w-4 h-4 text-muted-foreground" />
              {t("nav.mostPlayed")}
            </Link>
          </li>
          <li>
            <Link
              to="/{-$locale}/collections/$id"
              params={{ id: "top-wishlisted" }}
              className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-sm font-medium outline-none"
            >
              <StarIcon className="w-4 h-4 text-muted-foreground" />
              {t("nav.topWishlisted")}
            </Link>
          </li>
          <li>
            <Link
              to="/{-$locale}/collections/$id"
              params={{ id: "top-new-releases" }}
              className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-sm font-medium outline-none"
            >
              <CalendarCheck2Icon className="w-4 h-4 text-muted-foreground" />
              {t("nav.topNewReleases")}
            </Link>
          </li>
          {/* Link to rest of the collections */}
          <li>
            <Link
              to="/{-$locale}/collections"
              className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-xs font-medium outline-none text-primary underline"
            >
              {t("nav.seeAllCollections")}
            </Link>
          </li>
        </ul>
        <Separator className="my-4" />
        <h4 className="text-xs font-semibold text-muted-foreground mb-4 tracking-wider uppercase">
          {t("nav.others")}
        </h4>
        <ul className="space-y-1 list-none">
          <li>
            <Link
              to="/{-$locale}/stats/releases"
              className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-sm font-medium outline-none"
            >
              <BarChart3Icon className="w-4 h-4 text-muted-foreground" />
              {t("nav.releaseStats")}
            </Link>
          </li>
        </ul>
      </div>
      {/* Genres Column */}
      <div className="pl-8">
        <h4 className="text-xs font-semibold text-muted-foreground mb-4 tracking-wider uppercase">
          {t("nav.genres")}
        </h4>
        <ul className="space-y-1 list-none">
          {isLoading && <li className="text-muted-foreground text-sm">{t("common.loading")}</li>}
          {genres?.slice(0, 6).map((genre) => (
            <li key={genre.genre.id}>
              <Link
                to="/{-$locale}/search"
                search={{
                  tags: [genre.genre.id],
                }}
                className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-sm font-medium outline-none"
              >
                {genre.genre.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Link
            to="/{-$locale}/genres"
            className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 focus:bg-accent/40 transition text-xs text-primary underline font-medium outline-none"
          >
            {t("nav.seeAllGenres")}
          </Link>
        </div>
      </div>
    </div>
  );
};

const routes: Route[] = [
  {
    nameKey: "nav.explore",
    component: ExploreMenu,
  },
  {
    nameKey: "nav.browse",
    href: "/search",
    component: () => {
      const { t } = useTranslation();
      const { data } = useQuery({
        queryKey: ["top-section", { slug: "top-sellers" }],
        queryFn: () => getTopSection("top-sellers"),
      });

      const offer = data?.elements?.[0];

      return (
        <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[1fr_.75fr] lg:grid-rows-[repeat(3, auto)]">
          <ListItem href="/search" title={t("nav.searchItemTitle")}>
            {t("nav.searchItemDesc")}
          </ListItem>
          <ListItem href="/freebies" title={t("nav.freeGamesItemTitle")}>
            {t("nav.freeGamesItemDesc")}
          </ListItem>
          <ListItem href="/search?onSale=true" title={t("nav.withDiscountsItemTitle")}>
            {t("nav.withDiscountsItemDesc")}
          </ListItem>
          <li className="col-start-2 row-start-1 row-end-4">
            {offer && (
              <NavigationMenuLink asChild>
                <a
                  className="flex h-full w-full select-none flex-col justify-end rounded-md p-4 no-underline outline-none focus:shadow-md relative group"
                  href={`/offers/${offer.id}`}
                  style={{
                    backgroundImage: `url(${getImage(offer.keyImages, ["DieselGameBoxTall", "DieselStoreFrontTall", "OfferImageTall"])?.url ?? "/placeholder.webp"})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-transparent via-card/75 to-card z-0 rounded-md" />
                  <div className="mb-2 mt-4 text-base font-bold z-10">{offer.title}</div>
                  <p className="text-sm leading-tight text-muted-foreground z-10">
                    {t("nav.topSellerOnEpic")}
                  </p>
                </a>
              </NavigationMenuLink>
            )}
          </li>
        </ul>
      );
    },
  },
  {
    nameKey: "nav.sales",
    href: "/sales",
  },
  {
    nameKey: "nav.changelog",
    href: "/changelog",
  },
  {
    nameKey: "nav.about",
    href: "/about",
  },
];

const routeApi = getRouteApi("__root__");

export default function Navbar() {
  const { t } = useTranslation();
  const { session } = routeApi.useRouteContext();
  const navigate = useNavigate();
  const { setFocus, toggleFocus } = useSearch();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const { data: user } = useQuery({
    queryKey: ["user", { id: session?.user.email.split("@")[0] }],
    queryFn: () => getUserInformation(session?.user.email.split("@")[0] || null),
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleFocus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleFocus]);

  useEffect(() => {
    setSheetOpen(false);
  }, [locationHref]);

  const handleSearchClick = () => {
    setFocus(true);
    setSheetOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center px-4 md:px-6 gap-2 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <MenuIcon className="h-5 w-5" />
            <span className="sr-only">{t("nav.toggleMenu")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-[300px] flex-col gap-0 p-0 sm:w-[360px]">
          <SheetHeader className="flex-row items-center space-y-0 border-b border-border/50 p-4 pr-12 text-left">
            <Link to="/{-$locale}" className="flex items-center gap-2">
              <img
                src="https://cdn.egdata.app/logo_simple_white_clean.png"
                alt={t("nav.logoAlt")}
                width={32}
                height={32}
              />
              <SheetTitle className="text-lg text-foreground font-display font-bold tracking-tight">
                {t("common.appName")}
              </SheetTitle>
            </Link>
          </SheetHeader>
          <div className="p-4 pb-2">
            <button
              type="button"
              onClick={handleSearchClick}
              className="flex h-10 w-full cursor-text items-center gap-2 rounded-md border border-border/60 bg-card/40 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <SearchIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("common.searchPlaceholder")}</span>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 pt-2" aria-label={t("nav.toggleMenu")}>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="explore" className="border-b-0">
                <AccordionTrigger className={cn(mobileRowClass, "w-full hover:no-underline")}>
                  <span className="flex items-center gap-3">
                    <CompassIcon
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {t("nav.explore")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <MobileExploreMenu />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="my-2 border-t border-border/50" aria-hidden="true" />
            <MobileNavLink to="/{-$locale}/search" icon={LayoutGridIcon} label={t("nav.browse")} />
            <MobileNavLink
              to="/{-$locale}/freebies"
              icon={GiftIcon}
              label={t("nav.freeGamesItemTitle")}
            />
            <MobileNavLink to="/{-$locale}/sales" icon={TagIcon} label={t("nav.sales")} />
            <MobileNavLink
              to="/{-$locale}/changelog"
              icon={HistoryIcon}
              label={t("nav.changelog")}
            />
            <MobileNavLink to="/{-$locale}/about" icon={InfoIcon} label={t("nav.about")} />
          </nav>
          <div className="border-t border-border/50 p-4">
            {user ? (
              <div className="mb-3 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        user.avatar?.medium
                          ? user.avatar?.medium
                          : `https://shared-static-prod.epicgames.com/epic-profile-icon/D8033C/${user.displayName[0].toUpperCase()}/icon.png?size=512`
                      }
                    />
                    <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{user.displayName}</span>
                </div>
                <a href="/dashboard" className={mobileRowClass}>
                  <LayoutDashboardIcon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{t("nav.dashboard")}</span>
                </a>
                <a href="/auth/logout" className={mobileRowClass}>
                  <LogOutIcon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{t("nav.logout")}</span>
                </a>
                <div className="my-2 border-t border-border/50" aria-hidden="true" />
              </div>
            ) : (
              <button
                type="button"
                className={cn(mobileRowClass, "mb-3 w-full")}
                onClick={async () => {
                  await authClient.signIn.social({
                    provider: "epic",
                  });
                }}
              >
                <LogInIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{t("nav.signIn")}</span>
              </button>
            )}
            <DiscordBotPopover />
          </div>
        </SheetContent>
      </Sheet>
      <Link
        to="/{-$locale}"
        className="hidden lg:flex justify-center items-center"
        preload="viewport"
      >
        <img
          src="https://cdn.egdata.app/logo_simple_white_clean.png"
          alt={t("nav.logoAlt")}
          width={32}
          height={32}
        />
        <span className="text-lg text-foreground font-display font-bold tracking-tight ml-2">
          {t("common.appName")}
        </span>
      </Link>
      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList>
          {routes.map((route) => {
            if (route.component) {
              return (
                <NavigationMenuItem key={route.nameKey} className="bg-transparent">
                  <NavigationMenuTrigger
                    onClick={() => {
                      if (route.href) {
                        navigate({
                          to: route.href,
                        });
                      }
                    }}
                    className={cn(
                      "bg-transparent text-sm font-medium",
                      "hover:text-primary z-50",
                      "active:text-primary data-[active]:text-primary data-[state=open]:text-primary",
                    )}
                  >
                    {t(route.nameKey)}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>{route.component()}</NavigationMenuContent>
                </NavigationMenuItem>
              );
            }

            return (
              <NavigationMenuLink key={route.nameKey} asChild>
                <Link
                  key={route.nameKey}
                  to={route.href}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                >
                  {route.icon && <img src={route.icon} alt="" className="w-4 h-4" />}
                  {t(route.nameKey)}
                </Link>
              </NavigationMenuLink>
            );
          })}
          <DiscordBotPopover />
        </NavigationMenuList>
      </NavigationMenu>
      <div className="ml-auto flex min-w-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          className="hidden min-w-0 cursor-text items-center gap-2 rounded-md border border-border/60 bg-card/40 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground lg:inline-flex lg:h-9 lg:max-w-[190px] xl:max-w-none"
          onClick={handleSearchClick}
        >
          <SearchIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{t("common.searchPlaceholder")}</span>
          <kbd className="ml-1 hidden h-5 shrink-0 items-center gap-0.5 rounded border border-border/60 bg-background/60 px-1.5 font-mono text-[0.7rem] text-muted-foreground xl:inline-flex">
            ⌘K
          </kbd>
        </button>
        <CountriesSelector />
        <LocaleSelector />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                <Avatar>
                  <AvatarImage
                    src={
                      user.avatar?.medium
                        ? user.avatar?.medium
                        : `https://shared-static-prod.epicgames.com/epic-profile-icon/D8033C/${user.displayName[0].toUpperCase()}/icon.png?size=512`
                    }
                  />
                  <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="text-muted-foreground">
                  {t("nav.helloUser", { name: user.displayName })}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="/dashboard">{t("nav.dashboard")}</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="/auth/logout">{t("nav.logout")}</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!user && (
          <Avatar
            className="cursor-pointer"
            onClick={async () => {
              await authClient.signIn.social({
                provider: "epic",
              });
            }}
          >
            <AvatarFallback>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-5"
              >
                <path
                  fillRule="evenodd"
                  d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                  clipRule="evenodd"
                />
              </svg>
            </AvatarFallback>
          </Avatar>
        )}
        <ComparisonPortal />
      </div>
    </header>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
  title: string;
  href?: string;
  backgroundImage?: string;
}

const ListItem = React.forwardRef<React.ElementRef<"a">, ListItemProps>(
  ({ className, title, children, href, backgroundImage, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <Link
            ref={ref}
            className={cn(
              "block select-none rounded-md leading-none no-underline outline-none transition-colors h-full",
              "hover:text-accent-foreground focus:bg-accent hover:bg-accent focus:text-accent-foreground",
              "group relative overflow-hidden",
              className,
            )}
            to={href ?? "/"}
            {...props}
          >
            <div className="relative z-20 p-3 space-y-1">
              <div
                className={cn(
                  "text-sm font-medium leading-none",
                  !children && "text-lg font-semibold",
                )}
              >
                {title}
              </div>
              {children ? (
                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                  {children}
                </p>
              ) : null}
            </div>
            {backgroundImage && (
              <>
                <span className="absolute inset-0 bg-gradient-to-l from-transparent via-card/75 to-card z-10 rounded-md" />
                <div
                  className="h-full absolute inset-0 opacity-25 group-hover:opacity-75 bg-cover bg-center transition-opacity duration-500 ease-in-out rounded-md"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                  aria-hidden="true"
                />
              </>
            )}
          </Link>
        </NavigationMenuLink>
      </li>
    );
  },
);

ListItem.displayName = "ListItem";
