import { Link, useNavigate } from '@tanstack/react-router';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import React, { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQueries, useQuery } from '@tanstack/react-query';
import { getImage } from '@/lib/get-image';
import { getCollection } from '@/queries/collection';
import { getTopSection } from '@/queries/top-section';
import { CountriesSelector } from './countries-selector';
import { useSearch } from '@/hooks/use-search';
import { getRouteApi } from '@tanstack/react-router';
import { getUserInformation } from '@/queries/profiles';
import { DiscordBotPopover } from './discord-bot';
import { authClient } from '@/lib/auth-client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ListItemProps extends React.ComponentPropsWithoutRef<'a'> {
  title: string;
  href?: string;
  backgroundImage?: string;
}

function MobileMenuItem({
  title,
  children,
  href,
  backgroundImage,
}: ListItemProps) {
  return (
    <div className="py-2">
      {href ? (
        <Link
          to={href}
          className={cn(
            'block select-none rounded-md leading-none no-underline outline-none transition-colors',
            'hover:text-accent-foreground focus:bg-accent hover:bg-accent focus:text-accent-foreground',
            'group relative overflow-hidden',
          )}
        >
          <div className="relative z-20 p-3 space-y-1">
            <div className="text-sm font-medium leading-none">{title}</div>
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
      ) : (
        <div className="p-3 space-y-1">
          <div className="text-sm font-medium leading-none">{title}</div>
          {children ? (
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

type Route = {
  name: string;
  href: string;
  component?: () => JSX.Element;
};

const routes: Route[] = [
  {
    name: 'Browse',
    href: '/search',
    component: () => {
      const { data } = useQuery({
        queryKey: ['top-section', { slug: 'top-sellers' }],
        queryFn: () => getTopSection('top-sellers'),
      });

      const offer = data?.elements[0];

      return (
        <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[1fr_.75fr] lg:grid-rows-[repeat(3, auto)]">
          <ListItem href="/search" title="Search">
            Find what you're looking for on the Epic Games Store.
          </ListItem>
          <ListItem href="/freebies" title="Free Games">
            Explore the latest free game offerings on the Epic Games Store.
          </ListItem>
          <ListItem href="/search?on_sale=true" title="With Discounts">
            Check out games currently on sale with great discounts.
          </ListItem>
          <li className="col-start-2 row-start-1 row-end-4">
            {offer && (
              <NavigationMenuLink asChild>
                <a
                  className="flex h-full w-full select-none flex-col justify-end rounded-md p-4 no-underline outline-none focus:shadow-md relative group"
                  href={`/offers/${offer.id}`}
                  style={{
                    backgroundImage: `url(${getImage(offer.keyImages, ['DieselGameBoxTall', 'DieselStoreFrontTall', 'OfferImageTall'])?.url ?? '/placeholder.webp'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-transparent via-card/75 to-card z-0 rounded-md" />
                  <div className="mb-2 mt-4 text-base font-bold z-10">
                    {offer.title}
                  </div>
                  <p className="text-sm leading-tight text-muted-foreground z-10">
                    Top Seller on the Epic Games Store
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
    name: 'Rankings',
    href: '/collections',
    component: () => {
      const collections: {
        slug: string;
        title: string;
        description: string;
      }[] = [
        {
          slug: 'top-sellers',
          title: 'Top Sellers',
          description: 'Top sellers on the Epic Games Store',
        },
        {
          slug: 'most-played',
          title: 'Most Played',
          description: 'Most played games on the Epic Games Store',
        },
        {
          slug: 'top-wishlisted',
          title: 'Top Wishlisted',
          description: 'Top wishlisted games on the Epic Games Store',
        },
        {
          slug: 'top-new-releases',
          title: 'Top New Releases',
          description: 'Top new releases on the Epic Games Store',
        },
      ];

      const queries = useQueries({
        queries: collections.map((slug) => ({
          queryKey: [
            'collection',
            { slug: slug.slug, country: 'US', limit: 20, page: 1 },
          ],
          queryFn: () =>
            getCollection({
              slug: slug.slug,
              limit: 1,
              page: 1,
              country: 'US',
            }),
        })),
      });

      return (
        <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.5fr_.5fr] lg:grid-rows-[repeat(3, auto)]">
          {queries.map(({ data }, index) => (
            <ListItem
              key={collections[index].slug}
              href={`/collections/${collections[index].slug}`}
              title={data?.title ?? ''}
              backgroundImage={
                getImage(data?.elements[0]?.keyImages ?? [], [
                  'OfferImageWide',
                  'featuredMedia',
                  'DieselGameBoxWide',
                  'DieselStoreFrontWide',
                ])?.url ?? '/placeholder.webp'
              }
              className="min-h-[70px]"
            >
              {data?.elements[0]?.title}
            </ListItem>
          ))}
        </ul>
      );
    },
  },
  {
    name: 'Sales',
    href: '/sales',
  },
  {
    name: 'Genres',
    href: '/genres',
  },
  {
    name: 'Changelog',
    href: '/changelog',
  },
  {
    name: 'About',
    href: '/about',
  },
];

const routeApi = getRouteApi('__root__');

export default function Navbar() {
  const { session } = routeApi.useRouteContext();
  const navigate = useNavigate();
  const { setFocus, focus } = useSearch();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { data: user } = useQuery({
    queryKey: ['user', { id: session?.user.email.split('@')[0] }],
    queryFn: () =>
      getUserInformation(session?.user.email.split('@')[0] || null),
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (focus === false) {
          setFocus(true);
        } else {
          setFocus(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setFocus, focus]);

  const handleSearchClick = () => {
    setFocus(true);
    setSheetOpen(false);
  };

  return (
    <header className="flex h-20 w-full shrink-0 items-center px-4 md:px-6 gap-2">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="https://cdn.egdata.app/logo_simple_white_clean.png"
                alt="GameDB Logo"
                width={40}
                height={40}
              />
              <span className="text-xl text-white font-montserrat font-bold">
                EGDATA
              </span>
            </Link>
          </SheetHeader>
          <div className="p-4">
            <div
              className="relative mb-4 cursor-text"
              onClick={handleSearchClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchClick();
                }
              }}
            >
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search games..."
                className="pl-8 w-full cursor-text"
                readOnly
              />
            </div>
            <Accordion type="single" collapsible className="w-full">
              {routes.map((route) => (
                <AccordionItem key={route.name} value={route.name}>
                  <AccordionTrigger className="text-lg font-medium">
                    {route.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    {route.component ? (
                      <div className="pt-2">
                        {route.name === 'Browse' && (
                          <>
                            <MobileMenuItem href="/search" title="Search">
                              Find what you're looking for on the Epic Games
                              Store.
                            </MobileMenuItem>
                            <MobileMenuItem href="/freebies" title="Free Games">
                              Explore the latest free game offerings on the Epic
                              Games Store.
                            </MobileMenuItem>
                            <MobileMenuItem
                              href="/search?on_sale=true"
                              title="With Discounts"
                            >
                              Check out games currently on sale with great
                              discounts.
                            </MobileMenuItem>
                          </>
                        )}
                        {route.name === 'Rankings' && (
                          <>
                            <MobileMenuItem
                              href="/collections/top-sellers"
                              title="Top Sellers"
                            >
                              Top sellers on the Epic Games Store
                            </MobileMenuItem>
                            <MobileMenuItem
                              href="/collections/most-played"
                              title="Most Played"
                            >
                              Most played games on the Epic Games Store
                            </MobileMenuItem>
                            <MobileMenuItem
                              href="/collections/top-wishlisted"
                              title="Top Wishlisted"
                            >
                              Top wishlisted games on the Epic Games Store
                            </MobileMenuItem>
                            <MobileMenuItem
                              href="/collections/top-new-releases"
                              title="Top New Releases"
                            >
                              Top new releases on the Epic Games Store
                            </MobileMenuItem>
                          </>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={route.href}
                        className="block py-2 text-muted-foreground hover:text-white transition-colors"
                      >
                        {route.name}
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
      <Link
        to="/"
        className="hidden lg:flex justify-center items-center"
        preload="viewport"
      >
        <img
          src="https://cdn.egdata.app/logo_simple_white_clean.png"
          alt="EGDATA Logo"
          width={40}
          height={40}
        />
        <span className="text-xl text-white font-montserrat ml-2 font-bold">
          EGDATA
        </span>
      </Link>
      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList>
          {routes.map((route) => {
            if (route.component) {
              return (
                <NavigationMenuItem key={route.name} className="bg-transparent">
                  <NavigationMenuTrigger
                    onClick={() =>
                      navigate({
                        to: route.href,
                      })
                    }
                    className={cn(
                      'bg-transparent',
                      'hover:text-white z-50',
                      'active:text-white data-[active]:text-white data-[state=open]:text-white',
                    )}
                  >
                    {route.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    {route.component()}
                  </NavigationMenuContent>
                </NavigationMenuItem>
              );
            }

            return (
              <NavigationMenuLink key={route.name} asChild>
                <Button variant="ghost" className="hover:text-white" asChild>
                  <Link key={route.name} to={route.href}>
                    {route.name}
                  </Link>
                </Button>
              </NavigationMenuLink>
            );
          })}
          <DiscordBotPopover />
        </NavigationMenuList>
      </NavigationMenu>
      <div className="ml-auto flex items-center gap-4">
        <div
          className="relative cursor-text hidden lg:block"
          onClick={handleSearchClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchClick();
            }
          }}
        >
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search games..."
            className="pl-8 w-[200px] cursor-text"
            readOnly
          />
        </div>
        <CountriesSelector />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
                <Avatar>
                  <AvatarImage
                    src={
                      user.avatar?.medium
                        ? user.avatar?.medium
                        : `https://shared-static-prod.epicgames.com/epic-profile-icon/D8033C/${user.displayName[0].toUpperCase()}/icon.png?size=512`
                    }
                  />
                  <AvatarFallback>
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="dark:text-gray-300">
                  Hello, {user.displayName}!
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="/dashboard">Dashboard</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="/auth/logout">Logout</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!user && (
          <Avatar
            className="cursor-pointer"
            onClick={async () => {
              await authClient.signIn.oauth2({
                providerId: 'epic',
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

interface ListItemProps extends React.ComponentPropsWithoutRef<'a'> {
  title: string;
  href?: string;
  backgroundImage?: string;
}

const ListItem = React.forwardRef<React.ElementRef<'a'>, ListItemProps>(
  ({ className, title, children, href, backgroundImage, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <Link
            ref={ref}
            className={cn(
              'block select-none rounded-md leading-none no-underline outline-none transition-colors h-full',
              'hover:text-accent-foreground focus:bg-accent hover:bg-accent focus:text-accent-foreground',
              'group relative overflow-hidden',
              className,
            )}
            to={href ?? '/'}
            {...props}
          >
            <div className="relative z-20 p-3 space-y-1">
              <div
                className={cn(
                  'text-sm font-medium leading-none',
                  !children && 'text-lg font-semibold',
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

ListItem.displayName = 'ListItem';
