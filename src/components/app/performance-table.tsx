import { ChartBarIcon, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import type { OfferPosition } from '@/types/collections';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { DateRangePicker } from './date-range-picker';
import { PerformancePositionsChart } from '../charts/performance/positions';
import { CardStackIcon } from '@radix-ui/react-icons';
import { DateTime } from 'luxon';
import { useLocale } from '@/hooks/use-locale';

interface PerformanceCardProps {
  position: number;
  change: number;
  date: string;
}

function PerformanceCard({ position, change, date }: PerformanceCardProps) {
  const { timezone } = useLocale();

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
        {DateTime.fromISO(date)
          .setZone(timezone || 'UTC')
          .setLocale('en-GB')
          .toLocaleString({
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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4 py-3 bg-card border-white/10 border rounded-lg mt-4 text-center md:text-left">
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
  const { timezone } = useLocale();
  const [timeframe, setTimeframe] = useState<{ from: Date; to: Date | undefined }>({
    from: DateTime.now()
      .setZone(timezone || 'UTC')
      .minus({ days: 7 })
      .toJSDate(),
    to: DateTime.now()
      .setZone(timezone || 'UTC')
      .toJSDate(),
  });
  const [view, setView] = useState<'cards' | 'chart'>('cards');

  // Track if user has manually changed the timeframe
  const [hasUserSetTimeframe, setHasUserSetTimeframe] = useState(false);

  // Initialize timeframe when data first loads
  useEffect(() => {
    if (!data?.positions?.length || hasUserSetTimeframe) {
      return; // Don't override if user has set a custom timeframe
    }

    const positions = data.positions;
    const dates = positions.map((pos) =>
      DateTime.fromISO(pos.date).setZone(timezone || 'UTC'),
    );
    const minDate = DateTime.min(...dates);
    const maxDate = DateTime.max(...dates);

    if (!minDate || !maxDate) return;

    setTimeframe({
      from: minDate.toJSDate(),
      to: maxDate.toJSDate(),
    });
  }, [data?.positions, timezone, hasUserSetTimeframe]);

  // Extract filtered and sorted positions for reuse
  const filteredPositions = React.useMemo(() => {
    if (!data?.positions) return [];
    
    return data.positions
      .filter((pos) => {
        const date = DateTime.fromISO(pos.date).setZone(timezone || 'UTC');
        const fromDateTime = DateTime.fromJSDate(timeframe.from).setZone(
          timezone || 'UTC',
        );
        const toDateTime = timeframe.to 
          ? DateTime.fromJSDate(timeframe.to).setZone(timezone || 'UTC')
          : DateTime.now().setZone(timezone || 'UTC');
        
        return date >= fromDateTime.startOf('day') && date <= toDateTime.endOf('day');
      })
      .sort(
        (a, b) =>
          DateTime.fromISO(b.date).toMillis() -
          DateTime.fromISO(a.date).toMillis(),
      );
  }, [data?.positions, timeframe, timezone]);

  return (
    <div className="w-full p-6 bg-card rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Performance Table</h2>
        <DateRangePicker
          handleChange={({ from, to }) => {
            setTimeframe({ from, to });
            setHasUserSetTimeframe(true);
          }}
        />
      </div>

      <Tabs
        defaultValue={defaultCollection}
        className="w-full"
        onValueChange={onChange}
      >
        {/* Flex row for tops selection (left) and view toggle (right) */}
        <div className="flex justify-between items-center mb-6">
          <TabsList className="bg-gray-800 text-gray-400">
            {Object.entries(tops).map(([key]) => (
              <TabsTrigger key={key} value={key}>
                {topsDictionary[key]}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* View toggle as button group */}
          <div className="ml-4 flex gap-2 bg-gray-800 rounded-md p-1">
            <button
              type="button"
              onClick={() => setView('cards')}
              className={cn(
                'px-2 py-1 rounded flex items-center',
                view === 'cards'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white',
              )}
              aria-label="Cards view"
            >
              <CardStackIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('chart')}
              className={cn(
                'px-2 py-1 rounded flex items-center',
                view === 'chart'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white',
              )}
              aria-label="Chart view"
            >
              <ChartBarIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Cards View */}
        {view === 'cards' && data && filteredPositions.length > 0 && (
          <ScrollArea hidden={false}>
            <div className="flex gap-4 pb-4 justify-center w-full">
              {filteredPositions.map((pos, idx, array) => {
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
                const prev = array[idx + 1].position;

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

        {/* Chart View */}
        {view === 'chart' && data && filteredPositions.length > 0 && timeframe.to && (
          <PerformancePositionsChart
            positions={filteredPositions}
            timeframe={{ from: timeframe.from, to: timeframe.to }}
          />
        )}

        {/* Show appropriate messages for different states */}
        {!data && (
          <div className="flex justify-center items-center h-60">
            <p className="text-gray-500">No data found</p>
          </div>
        )}
        
        {data && filteredPositions.length === 0 && (
          <div className="flex justify-center items-center h-60">
            <p className="text-gray-500">No data available for the selected date range</p>
          </div>
        )}

        <StatsBar data={data} />
      </Tabs>
    </div>
  );
}
