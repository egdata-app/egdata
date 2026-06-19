import * as React from "react";
import { Button } from "@/components/aria/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/aria/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";
import {
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  RangeCalendar,
  type RangeValue,
} from "react-aria-components";
import { CalendarDate } from "@internationalized/date";

export function DateRangePicker({
  handleChange,
}: {
  handleChange: (dates: { from: Date; to: Date | undefined }) => void;
}) {
  const { timezone } = useLocale();
  const [isOpen, setIsOpen] = React.useState(false);

  // Initialize with last 7 days (6 days ago to today = 7 days total)
  const today = DateTime.now()
    .setZone(timezone || "UTC")
    .startOf("day");
  const [dateRange, setDateRange] = React.useState<RangeValue<CalendarDate>>({
    start: toCalendarDate(today.minus({ days: 6 })), // 6 days ago + today = 7 days
    end: toCalendarDate(today),
  });

  const quickSelections = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
  ];

  const handleQuickSelection = (days: number) => {
    const newRange = {
      start: toCalendarDate(today.minus({ days: days - 1 })),
      end: toCalendarDate(today),
    };
    setDateRange(newRange);
    handleChange(toDateRange(newRange, timezone));
    setIsOpen(false);
  };

  const getDaysDifference = (range: RangeValue<CalendarDate>): number => {
    if (!range.start || !range.end) return 0;
    const fromDate = calendarDateToDateTime(range.start, timezone).startOf("day");
    const toDate = calendarDateToDateTime(range.end, timezone).startOf("day");
    return Math.floor(toDate.diff(fromDate, "days").days) + 1; // +1 to include both start and end dates
  };

  const isValidRange = (range: RangeValue<CalendarDate>): boolean => {
    if (!range.start || !range.end) return false;
    const days = getDaysDifference(range);
    return days > 0 && days <= 30;
  };

  const handleCalendarSelect = (newRange: RangeValue<CalendarDate> | null) => {
    if (!newRange?.start || !newRange.end) {
      setDateRange(newRange ?? { start: toCalendarDate(today), end: toCalendarDate(today) });
      return;
    }

    const days = getDaysDifference(newRange);
    if (days > 30) {
      const limitedEnd = calendarDateToDateTime(newRange.start, timezone).plus({ days: 29 });
      setDateRange({ start: newRange.start, end: toCalendarDate(limitedEnd) });
    } else if (days > 0) {
      setDateRange(newRange);
    }
  };

  const formatDateRange = () => {
    if (dateRange.start && dateRange.end) {
      const fromFormatted = calendarDateToDateTime(dateRange.start, timezone).toFormat("MMM dd, yyyy");
      const toFormatted = calendarDateToDateTime(dateRange.end, timezone).toFormat("MMM dd, yyyy");
      const days = getDaysDifference(dateRange);
      return `${fromFormatted} - ${toFormatted} (${days} days)`;
    }
    return "Select Date Range";
  };

  const handleApply = () => {
    if (isValidRange(dateRange)) {
      handleChange(toDateRange(dateRange, timezone));
      setIsOpen(false);
    }
  };

  const canApply = isValidRange(dateRange);
  const dayCount = getDaysDifference(dateRange);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !dateRange.start && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex w-full max-w-3xl mx-auto rounded-lg border bg-card p-4">
          <div className="grid gap-4 w-full">
            <div className="flex justify-between">
              <div className="w-[calc(50%-0.5rem)]">
                <div className="mb-2 text-sm text-foreground">From</div>
                <div className="rounded-md border px-3 py-2 w-full">
                  {dateRange.start
                    ? calendarDateToDateTime(dateRange.start, timezone).toFormat("dd/MM/yyyy")
                    : "Select Date"}
                </div>
              </div>
              <div className="w-[calc(50%-0.5rem)]">
                <div className="mb-2 text-sm text-foreground">To</div>
                <div className="rounded-md border px-3 py-2 w-full">
                  {dateRange.end
                    ? calendarDateToDateTime(dateRange.end, timezone).toFormat("dd/MM/yyyy")
                    : "Select Date"}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-between">
              <RangeCalendar
                value={dateRange}
                onChange={handleCalendarSelect}
                visibleDuration={{ months: 2 }}
                isDateUnavailable={(date) => calendarDateToDateTime(date as CalendarDate, timezone) > today}
                className="flex-grow rounded-md border p-3"
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <Button slot="previous" variant="ghost" size="icon">‹</Button>
                  <Heading className="text-sm font-medium" />
                  <Button slot="next" variant="ghost" size="icon">›</Button>
                </header>
                <CalendarGrid className="border-separate border-spacing-1">
                  <CalendarGridHeader>
                    {(day) => (
                      <CalendarHeaderCell className="size-8 text-xs font-normal text-muted-foreground">
                        {day}
                      </CalendarHeaderCell>
                    )}
                  </CalendarGridHeader>
                  <CalendarGridBody>
                    {(date) => (
                      <CalendarCell
                        date={date}
                        className="flex size-8 items-center justify-center rounded-md text-sm outline-none data-[disabled]:opacity-40 data-[outside-month]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selection-start]:rounded-l-md data-[selection-end]:rounded-r-md data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring"
                      />
                    )}
                  </CalendarGridBody>
                </CalendarGrid>
              </RangeCalendar>
              <div className="grid gap-2 min-w-[150px]">
                {quickSelections.map((selection) => (
                  <Button
                    key={selection.label}
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleQuickSelection(selection.days)}
                  >
                    {selection.label}
                  </Button>
                ))}

                {/* Show current selection info */}
                {dateRange.start && dateRange.end && (
                  <div className="text-xs text-muted-foreground p-2 border rounded">
                    Selected: {dayCount} days
                  </div>
                )}

                <Button className="mt-auto" onClick={handleApply} disabled={!canApply}>
                  Apply
                </Button>

                {/* Error message */}
                {dateRange.start && dateRange.end && dayCount > 30 && (
                  <p className="text-xs text-danger mt-1">Maximum range is 30 days</p>
                )}

                {dateRange.start && dateRange.end && dayCount <= 0 && (
                  <p className="text-xs text-danger mt-1">Invalid date range</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function toCalendarDate(date: DateTime) {
  return new CalendarDate(date.year, date.month, date.day);
}

function calendarDateToDateTime(date: CalendarDate, timezone?: string) {
  return DateTime.fromObject(
    { year: date.year, month: date.month, day: date.day },
    { zone: timezone || "UTC" },
  ).startOf("day");
}

function toDateRange(range: RangeValue<CalendarDate>, timezone?: string) {
  return {
    from: calendarDateToDateTime(range.start, timezone).toJSDate(),
    to: range.end ? calendarDateToDateTime(range.end, timezone).toJSDate() : undefined,
  };
}
