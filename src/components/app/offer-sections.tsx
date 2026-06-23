import type { JSX } from "react";
import type * as React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type LinkItem = {
  id: string;
  label: string | JSX.Element;
  href: string;
};

type SectionSelectorProps = {
  links: LinkItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  orientation?: "horizontal" | "vertical";
};

function ControlledScrollArea({
  children,
  orientation: _orientation,
}: {
  children: React.ReactNode;
  orientation: "horizontal" | "vertical";
}) {
  return <ScrollArea>{children}</ScrollArea>;
}

export function SectionsNav({
  links,
  activeSection,
  onSectionChange,
  orientation = "horizontal",
}: SectionSelectorProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <ControlledScrollArea orientation={isHorizontal ? "horizontal" : "vertical"}>
      <nav
        className={cn("w-full max-w-full", isHorizontal ? "md:max-w-3xl" : "md:w-48 md:max-w-none")}
      >
        <ul
          className={cn(
            isHorizontal
              ? "inline-flex h-9 min-w-max items-center justify-center space-x-1 rounded-md bg-muted/50 p-1 text-muted-foreground"
              : "inline-flex h-9 min-w-max items-center justify-center space-x-1 rounded-md bg-muted/50 p-1 text-muted-foreground md:flex md:h-auto md:min-w-0 md:flex-col md:items-stretch md:justify-start md:space-x-0 md:space-y-1",
          )}
        >
          {links.map((link) => (
            <li
              key={link.id}
              className={cn(
                isHorizontal ? "inline-flex h-9" : "inline-flex h-9 md:flex md:w-full",
                "items-center justify-center rounded-md p-0 text-muted-foreground",
              )}
            >
              <Link
                to={link.href}
                className={cn(
                  activeSection === link.id
                    ? "bg-primary text-primary-foreground w-full"
                    : "hover:bg-primary/10 hover:text-primary text-muted-foreground w-full",
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                  !isHorizontal && "md:h-full md:justify-start",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  onSectionChange(link.id);
                }}
                preload="render"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ScrollBar orientation="horizontal" />
    </ControlledScrollArea>
  );
}
