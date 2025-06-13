import { ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import type { OfferPosition } from '@/types/collections';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { DateRangePicker } from './date-range-picker';

interface PerformanceCardProps {
  position: number;
  change: number;
  date: string;
}

function PerformanceCard({ position, change, date }: PerformanceCardProps) {
  const getChangeIcon = () => {
    if (change < 0) return <ChevronUp className="w-4 h-4" />;
    if (change > 0) return <ChevronDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getChangeText = () => {
    if (change === 0) return '';
    return Math.abs(change);
  };

  const getBackgroundClass = () => {
    if (change < 0) return 'bg-gradient-to-b from-green-700/50 to-card';
    if (change > 0) return 'bg-gradient-to-b from-red-800/50 to-card';
    return 'bg-card';
  };

  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center p-6 text-white min-w-[150px]',
        getBackgroundClass(),
      )}
    >
      <div
        className={cn(
          'text-2xl font-bold mb-2',
          position === 0 && 'opacity-70 text-xl',
        )}
      >
        {position === 0 ? 'Out of top' : `Top ${position}`}
      </div>

      <div className="flex items-center gap-1">
        {getChangeIcon()}
        <span>{getChangeText()}</span>
      </div>

      <div className="text-sm mt-4">
        {new Date(date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </div>
    </Card>
  );
}

interface StatsBarProps {
  data: OfferPosition | undefined;
  onChange?: (value: string) => void;
}

function StatsBar({ data }: StatsBarProps) {
  if (!data) return null;

  return (
    <div className="flex justify-between px-4 py-3 bg-card border-white/10 border rounded-lg mt-4">
      <div>
        Top 1: <span className="font-bold">{data.timesInTop1} days</span>
      </div>
      <div>
        Top 5: <span className="font-bold">{data.timesInTop5} days</span>
      </div>
      <div>
        Top 10: <span className="font-bold">{data.timesInTop10} days</span>
      </div>
      <div>
        Top 50: <span className="font-bold">{data.timesInTop50} days</span>
      </div>
      <div>
        Top 100: <span className="font-bold">{data.timesInTop100} days</span>
      </div>
    </div>
  );
}

const topsDictionary: Record<string, string> = {
  'top-sellers': 'Top Sellers',
  'most-played': 'Most Played',
  'top-wishlisted': 'Top Wishlisted',
  'top-new-releases': 'Top New Releases',
  'most-popular': 'Most Popular',
  'top-player-reviewed': 'Top Player Rated',
  'top-demos': 'Top Demos',
  'top-free-to-play': 'Top Free-to-Play',
  'top-add-ons': 'Top Add-ons',
};

export function PerformanceTable({
  data,
  onChange,
  tops,
  defaultCollection,
}: {
  data: OfferPosition | undefined;
  onChange: (value: string) => void;
  tops: Record<string, number>;
  defaultCollection: string;
}) {
  const [timeframe, setTimeframe] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });

  // Add effect to automatically set timeframe to shortest range with data
  useEffect(() => {
    if (!data?.positions.length) return;

    const positions = data.positions;
    const dates = positions.map((pos) => new Date(pos.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // If we have data, set the timeframe to cover all available data
    setTimeframe({
      from: minDate,
      to: maxDate,
    });
  }, [data]);

  return (
    <div className="w-full p-6 bg-card rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Performance Table</h2>
        <DateRangePicker
          handleChange={({ from, to }) =>
            setTimeframe({ from, to: to || new Date() })
          }
        />
      </div>

      <Tabs
        // Get the lowest value from the tops object
        defaultValue={defaultCollection}
        className="w-full"
        onValueChange={onChange}
      >
        <TabsList className="bg-gray-800 text-gray-400 mb-6">
          {Object.entries(tops).map(([key]) => (
            <TabsTrigger key={key} value={key}>
              {topsDictionary[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        {data && data.positions.length > 0 && (
          <ScrollArea hidden={false}>
            <div className="flex gap-4 pb-4 justify-center w-full">
              {data?.positions
                // Sort by date, closest to today first
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                // Filter by date range
                .filter((pos) => {
                  const date = new Date(pos.date);
                  return date >= timeframe.from && date <= timeframe.to;
                })
                .map((pos, idx, array) => {
                  // If it's the first item, there's no previous position
                  if (idx === array.length - 1) {
                    return (
                      <PerformanceCard
                        key={pos._id}
                        position={pos.position}
                        change={0}
                        date={pos.date}
                      />
                    );
                  }

                  // Previous position
                  const prev = data.positions[idx + 1].position;

                  // Normalize 0 => 100 to treat "out of tops" as position 100
                  const toPositionValue = (p: number) => (p === 0 ? 100 : p);

                  // Calculate change
                  const change =
                    toPositionValue(pos.position) - toPositionValue(prev);

                  return (
                    <PerformanceCard
                      key={pos._id}
                      position={pos.position}
                      change={change}
                      date={pos.date}
                    />
                  );
                })}
            </div>
            <ScrollBar orientation="horizontal" hidden={false} />
          </ScrollArea>
        )}

        {/** Show that there are no data if the data is not available */}
        {!data && (
          <div className="flex justify-center items-center h-60">
            <p className="text-gray-500">No data found</p>
          </div>
        )}

        <StatsBar data={data} />
      </Tabs>
    </div>
  );
}
