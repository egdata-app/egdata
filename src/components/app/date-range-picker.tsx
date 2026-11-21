import * as React from "react";
import { CalendarDate } from "@internationalized/date";
import { RangeCalendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";
import { useTranslation } from "@/lib/paraglide-react";

export function DateRangePicker({
  handleChange,
}: {
  handleChange: (dates: { from: Date; to: Date | undefined }) => void;
}) {
  const { locale, timezone } = useLocale();
  const { t } = useTranslation();
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
    { label: t("components.dateRangePicker.last7Days"), days: 7 },
    { label: t("components.dateRangePicker.last30Days"), days: 30 },
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

  const toCalendarDate = (date: Date) => {
    const dt = DateTime.fromJSDate(date).setZone(timezone || "UTC");
    return new CalendarDate(dt.year, dt.month, dt.day);
  };

  const fromCalendarDate = (date: CalendarDate) => {
    return DateTime.fromObject(
      { year: date.year, month: date.month, day: date.day },
      { zone: timezone || "UTC" },
    ).toJSDate();
  };

  const handleCalendarSelect = (newRange: { start: CalendarDate; end: CalendarDate } | null) => {
    if (!newRange) {
      setDateRange({ from: today.toJSDate(), to: undefined });
      return;
    }

    const from = fromCalendarDate(newRange.start);
    const to = fromCalendarDate(newRange.end);
    const days = getDaysDifference(from, to);

    if (days > 30) {
      // Limit to 30 days from the 'from' date
      const limitedTo = DateTime.fromJSDate(from).startOf("day").plus({ days: 29 }).toJSDate();
      setDateRange({ from, to: limitedTo });
    } else if (days > 0) {
      setDateRange({ from, to });
    }
  };

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      const fromFormatted = DateTime.fromJSDate(dateRange.from)
        .setZone(timezone || "UTC")
        .setLocale(locale || "en-US")
        .toLocaleString(DateTime.DATE_MED);
      const toFormatted = DateTime.fromJSDate(dateRange.to)
        .setZone(timezone || "UTC")
        .setLocale(locale || "en-US")
        .toLocaleString(DateTime.DATE_MED);
      const days = getDaysDifference(dateRange.from, dateRange.to);
      return t("components.dateRangePicker.rangeLabel", {
        count: days,
        from: fromFormatted,
        to: toFormatted,
      });
    }
    return t("components.dateRangePicker.selectDateRange");
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
    <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
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
      <Popover className="w-auto p-0" placement="bottom end">
        <div className="flex w-full max-w-3xl mx-auto rounded-lg border bg-card p-4">
          <div className="grid gap-4 w-full">
            <div className="flex justify-between">
              <div className="w-[calc(50%-0.5rem)]">
                <div className="mb-2 text-sm text-foreground">
                  {t("components.dateRangePicker.from")}
                </div>
                <div className="rounded-md border px-3 py-2 w-full">
                  {dateRange.from
                    ? DateTime.fromJSDate(dateRange.from)
                        .setZone(timezone || "UTC")
                        .setLocale(locale || "en-US")
                        .toLocaleString(DateTime.DATE_SHORT)
                    : t("components.dateRangePicker.selectDate")}
                </div>
              </div>
              <div className="w-[calc(50%-0.5rem)]">
                <div className="mb-2 text-sm text-foreground">
                  {t("components.dateRangePicker.to")}
                </div>
                <div className="rounded-md border px-3 py-2 w-full">
                  {dateRange.to
                    ? DateTime.fromJSDate(dateRange.to)
                        .setZone(timezone || "UTC")
                        .setLocale(locale || "en-US")
                        .toLocaleString(DateTime.DATE_SHORT)
                    : t("components.dateRangePicker.selectDate")}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-between">
              <RangeCalendar
                value={
                  dateRange.from && dateRange.to
                    ? {
                        start: toCalendarDate(dateRange.from),
                        end: toCalendarDate(dateRange.to),
                      }
                    : null
                }
                onChange={handleCalendarSelect}
                numberOfMonths={2}
                className="rounded-md border flex-grow"
                maxValue={new CalendarDate(today.year, today.month, today.day)}
              />
              <div className="grid gap-2 min-w-[150px]">
                {quickSelections.map((selection) => (
                  <Button
                    key={selection.label}
                    variant="outline"
                    className="justify-start"
                    onPress={() => handleQuickSelection(selection.days)}
                  >
                    {selection.label}
                  </Button>
                ))}

                {/* Show current selection info */}
                {dateRange.from && dateRange.to && (
                  <div className="text-xs text-muted-foreground p-2 border rounded">
                    {t("components.dateRangePicker.selectedDays", { count: dayCount })}
                  </div>
                )}

                <Button className="mt-auto" onPress={handleApply} isDisabled={!canApply}>
                  {t("components.dateRangePicker.apply")}
                </Button>

                {/* Error message */}
                {dateRange.from && dateRange.to && dayCount > 30 && (
                  <p className="text-xs text-red-500 mt-1">
                    {t("components.dateRangePicker.maxRange")}
                  </p>
                )}

                {dateRange.from && dateRange.to && dayCount <= 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    {t("components.dateRangePicker.invalidRange")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Popover>
    </PopoverTrigger>
  );
}
