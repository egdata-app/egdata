import { useNavigate } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import React, { useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavigationMenu } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
  Gamepad2Icon,
  SwordIcon,
  JoystickIcon,
  BrainIcon,
  TrendingUpIcon,
  UsersIcon,
  BarChart3Icon,
  TagIcon,
  GiftIcon,
  StarIcon,
  CalendarCheck2Icon,
} from "lucide-react";
import { httpClient } from "@/lib/http-client";
import { useTranslation } from "@/lib/paraglide-react";
import type { GenreResponse } from "@/routes/{-$locale}/genres";
import { Separator } from "../ui/separator";

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
  title: string;
  href?: string;
  backgroundImage?: string;
}

function MobileMenuItem({ title, children, href, backgroundImage }: ListItemProps) {
  return (
    <div className="py-2">
      {href ? (
        <Link
          to={href}
          className={cn(
            "block select-none rounded-md leading-none no-underline outline-none transition-colors",
            "hover:text-accent-foreground focus:bg-accent hover:bg-accent focus:text-accent-foreground",
            "group relative overflow-hidden",
          )}
        >
          <div className="relative z-20 p-3 space-y-1">
            <div className="text-sm font-medium leading-none">{title}</div>
            {children ? (
              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
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
      ) : (
        <div className="p-3 space-y-1">
          <div className="text-sm font-medium leading-none">{title}</div>
          {children ? (
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
          ) : null}
        </div>
      )}
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
        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b border-border/50">
            <Link to="/{-$locale}" className="flex items-center gap-2">
              <img
                src="https://cdn.egdata.app/logo_simple_white_clean.png"
                alt={t("nav.logoAlt")}
                width={32}
                height={32}
              />
              <span className="text-lg text-foreground font-display font-bold tracking-tight">
                {t("common.appName")}
              </span>
            </Link>
          </SheetHeader>
          <div className="p-4">
            <div
              className="relative mb-4 cursor-text"
              onClick={handleSearchClick}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchClick();
                }
              }}
            >
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("common.searchPlaceholder")}
                className="pl-8 w-full cursor-text"
                readOnly
              />
            </div>
            <Accordion type="single" collapsible className="w-full">
              {routes.map((route) => (
                <AccordionItem key={route.nameKey} value={route.nameKey}>
                  <AccordionTrigger className="text-base font-medium">
                    {t(route.nameKey)}
                  </AccordionTrigger>
                  <AccordionContent>
                    {route.component ? (
                      <div className="pt-2">
                        {route.nameKey === "nav.explore" && (
                          <>
                            <div className="mb-4">
                              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider uppercase">
                                {t("nav.genres")}
                              </div>
                              <MobileMenuItem href="/genres/action" title={t("nav.action")}>
                                <SwordIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.action")}
                              </MobileMenuItem>
                              <MobileMenuItem href="/genres/rpg" title={t("nav.rpg")}>
                                <Gamepad2Icon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.rpg")}
                              </MobileMenuItem>
                              <MobileMenuItem href="/genres/indie" title={t("nav.indie")}>
                                <JoystickIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.indie")}
                              </MobileMenuItem>
                              <MobileMenuItem href="/genres/strategy" title={t("nav.strategy")}>
                                <BrainIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.strategy")}
                              </MobileMenuItem>
                              {/* Add more genres as needed */}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider uppercase">
                                {t("nav.other")}
                              </div>
                              <MobileMenuItem
                                href="/collections/top-sellers"
                                title={t("nav.topSellers")}
                              >
                                <TrendingUpIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.topSellers")}
                              </MobileMenuItem>
                              <MobileMenuItem
                                href="/collections/most-played"
                                title={t("nav.mostPlayed")}
                              >
                                <UsersIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.mostPlayed")}
                              </MobileMenuItem>
                              <MobileMenuItem
                                href="/collections/top-wishlisted"
                                title={t("nav.topWishlisted")}
                              >
                                <StarIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.topWishlisted")}
                              </MobileMenuItem>
                              <MobileMenuItem
                                href="/collections/top-new-releases"
                                title={t("nav.topNewReleases")}
                              >
                                <CalendarCheck2Icon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.topNewReleases")}
                              </MobileMenuItem>
                              <MobileMenuItem href="/stats/releases" title={t("nav.releaseStats")}>
                                <BarChart3Icon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.releaseStats")}
                              </MobileMenuItem>
                              <MobileMenuItem href="/sales" title={t("nav.sales")}>
                                <TagIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.sales")}
                              </MobileMenuItem>
                              <MobileMenuItem href="/freebies" title={t("nav.freeGamesItemTitle")}>
                                <GiftIcon className="w-4 h-4 mr-2 text-muted-foreground inline" />
                                {t("nav.freeGamesItemTitle")}
                              </MobileMenuItem>
                              {/* Add more links as needed */}
                            </div>
                          </>
                        )}
                        {route.nameKey === "nav.browse" && (
                          <>
                            <MobileMenuItem href="/search" title={t("nav.searchItemTitle")}>
                              {t("nav.searchItemDesc")}
                            </MobileMenuItem>
                            <MobileMenuItem href="/freebies" title={t("nav.freeGamesItemTitle")}>
                              {t("nav.freeGamesItemDesc")}
                            </MobileMenuItem>
                            <MobileMenuItem
                              href="/search?onSale=true"
                              title={t("nav.withDiscountsItemTitle")}
                            >
                              {t("nav.withDiscountsItemDesc")}
                            </MobileMenuItem>
                          </>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={route.href}
                        className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t(route.nameKey)}
                      </Link>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="mt-4 pt-4 border-t">
              <DiscordBotPopover />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Link to="/{-$locale}" className="hidden lg:flex justify-center items-center" preload="viewport">
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
              await authClient.signIn.oauth2({
                providerId: "epic",
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
