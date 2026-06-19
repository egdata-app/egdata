import * as React from "react";
import {
  Button as AriaButton,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  Heading,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function Accordion({
  className,
  type = "single",
  collapsible: _collapsible = true,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<typeof DisclosureGroup>, "defaultExpandedKeys"> & {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
}) {
  return (
    <DisclosureGroup
      allowsMultipleExpanded={type === "multiple"}
      defaultExpandedKeys={
        defaultValue ? (Array.isArray(defaultValue) ? defaultValue : [defaultValue]) : undefined
      }
      className={cn(className)}
      {...(props as any)}
    />
  );
}

function AccordionItem({ className, value, ...props }: React.ComponentProps<typeof Disclosure> & { value?: string }) {
  return <Disclosure id={value} className={cn("border-b border-stroke-subtle", className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AriaButton>) {
  return (
    <Heading className="flex">
      <AriaButton
        slot="trigger"
        className={cn(
          "group flex flex-1 items-center justify-between py-4 text-sm font-semibold text-text-secondary transition-colors outline-none hover:text-text-primary data-[focus-visible]:ring-2 data-[focus-visible]:ring-interactive/35",
          className,
        )}
        {...(props as any)}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-text-muted transition-transform duration-200 group-data-[expanded]:rotate-180" />
      </AriaButton>
    </Heading>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof DisclosurePanel>) {
  return (
    <DisclosurePanel className="overflow-hidden text-sm text-text-secondary data-[entering]:animate-accordion-down data-[exiting]:animate-accordion-up" {...props}>
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </DisclosurePanel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
