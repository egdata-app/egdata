import type { JSX } from "react";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { localizeHref } from "@/lib/paraglide-strategy";
import { Link } from "@/components/app/localized-link";

type LinkItem = {
  id: string;
  label: string | JSX.Element;
  href: string;
  to?: string;
  params?: Record<string, unknown>;
  preload?: false | "intent" | "render" | "viewport";
  resetScroll?: boolean;
};

type SectionSelectorProps = {
  links: LinkItem[];
  activeSection: string;
  onSectionChange?: (id: string) => void;
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
              ? "inline-flex min-w-max items-center justify-center gap-1 rounded-lg border border-border/60 bg-card/80 p-1 text-muted-foreground shadow-sm"
              : "inline-flex min-w-max items-center justify-center gap-1 rounded-lg border border-border/60 bg-card/80 p-1 text-muted-foreground shadow-sm md:flex md:h-auto md:min-w-0 md:flex-col md:items-stretch md:justify-start",
          )}
        >
          {links.map((link) => {
            const isActive = activeSection === link.id;
            const linkClassName = cn(
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              "inline-flex w-full items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
              !isHorizontal && "md:justify-start",
            );

            return (
              <li
                key={link.id}
                className={cn(
                  isHorizontal ? "inline-flex" : "inline-flex md:flex md:w-full",
                  "items-center justify-center rounded-md p-0 text-muted-foreground",
                )}
              >
                {link.to ? (
                  <Link
                    to={link.to}
                    params={link.params}
                    preload={link.preload}
                    resetScroll={link.resetScroll ?? false}
                    aria-current={isActive ? "page" : undefined}
                    className={linkClassName}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={localizeHref(link.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={linkClassName}
                    onClick={(e) => {
                      e.preventDefault();
                      onSectionChange?.(link.id);
                    }}
                  >
                    {link.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </ControlledScrollArea>
  );
}
