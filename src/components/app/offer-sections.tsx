import type { JSX } from "react";
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
  orientation,
}: {
  children: React.ReactNode;
  orientation: "horizontal" | "vertical";
}) {
  const isHorizontal = orientation === "horizontal";

  if (isHorizontal) {
    return <ScrollArea>{children}</ScrollArea>;
  }

  return <>{children}</>;
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
      <nav className={cn("w-full max-w-3xl", isHorizontal ? "flex-row" : "flex-col w-48")}>
        <ul
          className={cn(
            isHorizontal
              ? "inline-flex h-9 items-center justify-center space-x-2 rounded-lg bg-muted p-1 text-muted-foreground"
              : "flex flex-col space-y-1 rounded-lg bg-muted p-1 text-muted-foreground",
          )}
        >
          {links.map((link) => (
            <li
              key={link.id}
              className={cn(
                isHorizontal ? "inline-flex h-9" : "flex w-full",
                "items-center justify-center rounded-lg bg-muted p-0 text-muted-foreground",
              )}
            >
              <Link
                to={link.href}
                className={cn(
                  activeSection === link.id
                    ? "bg-background text-white shadow w-full"
                    : "hover:bg-primary/10 text-gray-200 w-full",
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  !isHorizontal && "h-full justify-start",
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
      {isHorizontal && <ScrollBar orientation="horizontal" />}
    </ControlledScrollArea>
  );
}
