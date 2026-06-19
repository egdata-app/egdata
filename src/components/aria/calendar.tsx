import * as React from "react";
import { Calendar as AriaCalendar, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading } from "react-aria-components";
import { Button } from "@/components/aria/button";

import { cn } from "@/lib/utils";

function Calendar({ className, ...props }: React.ComponentProps<typeof AriaCalendar>) {
  return (
    <AriaCalendar className={cn("w-fit rounded-md border bg-background p-3", className)} {...props}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <Button slot="previous" variant="ghost" size="icon">‹</Button>
        <Heading className="text-sm font-medium" />
        <Button slot="next" variant="ghost" size="icon">›</Button>
      </header>
      <CalendarGrid className="border-separate border-spacing-1">
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell className="size-8 text-xs font-normal text-muted-foreground">{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className="flex size-8 items-center justify-center rounded-md text-sm outline-none data-[disabled]:opacity-40 data-[outside-month]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring"
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  );
}

export { Calendar };
