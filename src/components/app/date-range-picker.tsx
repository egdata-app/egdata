import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";

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
  const [dateRange, setDateRange] = React.useState<{
    from: Date;
    to: Date | undefined;
  }>({
    from: today.minus({ days: 6 }).toJSDate(), // 6 days ago + today = 7 days
    to: today.toJSDate(),
  });

  const quickSelections = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
  ];

  const handleQuickSelection = (days: number) => {
    const to = today.toJSDate();
    const from = today.minus({ days: days - 1 }).toJSDate(); // days - 1 to include today
    const newRange = { from, to };
    setDateRange(newRange);
    handleChange(newRange);
    setIsOpen(false);
  };

  const getDaysDifference = (from: Date, to: Date | undefined): number => {
    if (!from || !to) return 0;
    const fromDate = DateTime.fromJSDate(from).startOf("day");
    const toDate = DateTime.fromJSDate(to).startOf("day");
    return Math.floor(toDate.diff(fromDate, "days").days) + 1; // +1 to include both start and end dates
  };

  const isValidRange = (from: Date, to: Date | undefined): boolean => {
    if (!from || !to) return false;
    const days = getDaysDifference(from, to);
    return days > 0 && days <= 30;
  };

  const handleCalendarSelect = (newRange: { from: Date; to: Date | undefined } | undefined) => {
    if (!newRange) {
      setDateRange({ from: today.toJSDate(), to: undefined });
      return;
    }

    const { from, to } = newRange;

    // If only 'from' is selected, set 'to' as undefined
    if (from && !to) {
      setDateRange({ from, to: undefined });
      return;
    }

    // If both dates are selected, validate the range
    if (from && to) {
      const days = getDaysDifference(from, to);

      if (days > 30) {
        // Limit to 30 days from the 'from' date
        const limitedTo = DateTime.fromJSDate(from).startOf("day").plus({ days: 29 }).toJSDate();
        setDateRange({ from, to: limitedTo });
      } else if (days > 0) {
        setDateRange({ from, to });
      }
    }
  };

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      const fromFormatted = DateTime.fromJSDate(dateRange.from)
        .setZone(timezone || "UTC")
        .toFormat("MMM dd, yyyy");
      const toFormatted = DateTime.fromJSDate(dateRange.to)
        .setZone(timezone || "UTC")
        .toFormat("MMM dd, yyyy");
      const days = getDaysDifference(dateRange.from, dateRange.to);
      return `${fromFormatted} - ${toFormatted} (${days} days)`;
    }
    return "Select Date Range";
  };

  const handleApply = () => {
    if (isValidRange(dateRange.from, dateRange.to)) {
      handleChange(dateRange);
      setIsOpen(false);
    }
  };

  const canApply = isValidRange(dateRange.from, dateRange.to);
  const dayCount = getDaysDifference(dateRange.from, dateRange.to);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !dateRange.from && "text-muted-foreground",
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
                  {dateRange.from
                    ? DateTime.fromJSDate(dateRange.from)
                        .setZone(timezone || "UTC")
                        .toFormat("dd/MM/yyyy")
                    : "Select Date"}
                </div>
              </div>
              <div className="w-[calc(50%-0.5rem)]">
                <div className="mb-2 text-sm text-foreground">To</div>
                <div className="rounded-md border px-3 py-2 w-full">
                  {dateRange.to
                    ? DateTime.fromJSDate(dateRange.to)
                        .setZone(timezone || "UTC")
                        .toFormat("dd/MM/yyyy")
                    : "Select Date"}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-between">
              <Calendar
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                className="rounded-md border flex-grow"
                disabled={(date) => {
                  // Disable future dates
                  return date > today.toJSDate();
                }}
              />
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
                {dateRange.from && dateRange.to && (
                  <div className="text-xs text-muted-foreground p-2 border rounded">
                    Selected: {dayCount} days
                  </div>
                )}

                <Button className="mt-auto" onClick={handleApply} disabled={!canApply}>
                  Apply
                </Button>

                {/* Error message */}
                {dateRange.from && dateRange.to && dayCount > 30 && (
                  <p className="text-xs text-red-500 mt-1">Maximum range is 30 days</p>
                )}

                {dateRange.from && dateRange.to && dayCount <= 0 && (
                  <p className="text-xs text-red-500 mt-1">Invalid date range</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
