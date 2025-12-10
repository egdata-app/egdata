import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  getGameAwardsData,
  YOUTUBE_VIDEO_ID,
  type GameAwardsSection as GameAwardsSectionProps,
} from '@/queries/game-awards';
import { OfferCard } from '@/components/app/offer-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/the-game-awards')({
  component: GameAwardsPage,

  loader: async ({ context }) => {
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ['game-awards'],
      queryFn: () => getGameAwardsData(),
    });
  },

  head: () => {
    const title = 'The Game Awards Coverage | egdata.app';
    const description =
      'Latest games announced and nominated at The Game Awards coming to Epic Games Store.';
    const image = 'https://api.egdata.app/game-awards/og';

    return {
      meta: [
        {
          title,
        },
        {
          name: 'description',
          content: description,
        },
        {
          property: 'og:title',
          content: title,
        },
        {
          property: 'og:description',
          content: description,
        },
        {
          property: 'og:image',
          content: image,
        },
        {
          property: 'twitter:title',
          content: title,
        },
        {
          property: 'twitter:description',
          content: description,
        },
        {
          property: 'twitter:image',
          content: image,
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
      ],
    };
  },
});

function GameAwardsPage() {
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['game-awards'],
    queryFn: () => getGameAwardsData(),
    placeholderData: [],
  });

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [miniPlayerDismissed, setMiniPlayerDismissed] = useState(false);

  // Sort sections with announcements first
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => {
      const aIsAnnouncement = a.title.toLowerCase().includes('announcement');
      const bIsAnnouncement = b.title.toLowerCase().includes('announcement');
      if (aIsAnnouncement && !bIsAnnouncement) return -1;
      if (!aIsAnnouncement && bIsAnnouncement) return 1;
      return 0;
    });
  }, [sections]);

  // Initialize expanded sections - first section expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (sortedSections.length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set([sortedSections[0].title]));
    }
  }, [sortedSections, expandedSections.size]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  // Mini-player visibility based on scroll
  useEffect(() => {
    if (!YOUTUBE_VIDEO_ID) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!miniPlayerDismissed) {
          setIsMiniPlayer(!entry.isIntersecting);
        }
      },
      { threshold: 0.1 },
    );

    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }

    return () => observer.disconnect();
  }, [miniPlayerDismissed]);

  const announcementCount = sections
    .filter((section) => section.title.toLowerCase().includes('announcement'))
    .reduce((acc, section) => acc + section.offers.length, 0);

  const handleDismissMiniPlayer = () => {
    setMiniPlayerDismissed(true);
    setIsMiniPlayer(false);
  };

  const handleExpandMiniPlayer = () => {
    // Scroll back to the video
    videoContainerRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 py-6 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <header className="text-center space-y-4">
        <img
          src="https://cdn.egdata.app/images/logo-tga-gold.svg"
          alt="The Game Awards 2025"
          className="h-16 sm:h-20 md:h-24 mx-auto"
        />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Games announced or nominated at The Game Awards coming to Epic Games
          Store
        </p>
      </header>

      {/* YouTube Embed Section - Single Instance */}
      {YOUTUBE_VIDEO_ID && (
        <>
          {/* Placeholder to maintain layout when mini-player is active */}
          <section className="w-full aspect-video" ref={videoContainerRef}>
            <div
              className={cn(
                isMiniPlayer && !miniPlayerDismissed
                  ? 'fixed bottom-4 right-4 z-50 w-[500px] aspect-video rounded-lg overflow-hidden shadow-2xl border border-white/20 bg-black'
                  : 'relative w-full aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 shadow-2xl',
              )}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&enablejsapi=1`}
                title="The Game Awards 2024 - Live Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Mini-player controls */}
              {isMiniPlayer && !miniPlayerDismissed && (
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button
                    type="button"
                    onClick={handleExpandMiniPlayer}
                    className="p-1.5 bg-black/70 hover:bg-black rounded-full transition-colors"
                    aria-label="Expand player"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissMiniPlayer}
                    className="p-1.5 bg-black/70 hover:bg-black rounded-full transition-colors"
                    aria-label="Close mini player"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <section key={i} className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4].map((j) => (
                  <Card key={j} className="animate-pulse">
                    <div className="aspect-[3/4] bg-white/5 rounded-t-lg" />
                    <CardContent className="p-4 space-y-2 h-44">
                      <div className="h-5 bg-white/5 rounded w-3/4" />
                      <div className="h-4 bg-white/5 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sections.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">No games announced yet</h3>
          <p className="text-muted-foreground">
            Check back after The Game Awards!
          </p>
        </Card>
      )}

      {/* Sections */}
      {!isLoading && sections.length > 0 && (
        <div className="space-y-6">
          {/* Total count badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              {announcementCount}{' '}
              {announcementCount === 1 ? 'announcement' : 'announcements'}
            </Badge>
          </div>

          {sortedSections.map((section) => (
            <GameAwardsSection
              key={section.title}
              section={section}
              isExpanded={expandedSections.has(section.title)}
              onToggle={() => toggleSection(section.title)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function GameAwardsSection({
  section,
  isExpanded,
  onToggle,
}: {
  section: GameAwardsSectionProps;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (section.offers.length === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-card/50 hover:bg-card/80 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">{section.title}</h2>
            <Badge variant="outline" className="text-sm">
              {section.offers.length}
            </Badge>
          </div>
          <ChevronDown
            className={cn(
              'w-6 h-6 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-6">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {section.offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} size="md" />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
