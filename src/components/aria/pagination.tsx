import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";

import { cn } from "@/lib/utils";
import { type ButtonProps, buttonVariants, Button } from "@/components/aria/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
);

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />,
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn("", className)} {...props} />,
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
  to: string;
  prefetch?: "intent" | "render" | "none" | "viewport";
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <Link
    aria-current={isActive ? "page" : undefined}
    className={cn(buttonVariants({ variant: isActive ? "outline" : "ghost", size }), className)}
    preload={props.prefetch ?? "none"}
    {...props}
  />
);

type PaginationButtonProps = { isActive?: boolean } & Pick<ButtonProps, "size"> & React.ComponentProps<"button">;

const PaginationButton = ({ className, isActive, size = "icon", ...props }: PaginationButtonProps) => (
  <Button className={className} variant={isActive ? "outline" : "ghost"} size={size} {...props} />
);

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="default" className={cn("gap-1 pl-2.5", className)} {...props}>
    <ChevronLeft className="size-4" />
    <span>Previous</span>
  </PaginationLink>
);

const PaginationPreviousButton = ({ className, ...props }: React.ComponentProps<typeof PaginationButton>) => (
  <PaginationButton aria-label="Go to previous page" size="default" className={cn("gap-1 pl-2.5", className)} {...props}>
    <ChevronLeft className="size-4" />
    <span>Previous</span>
  </PaginationButton>
);

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="default" className={cn("gap-1 pr-2.5", className)} prefetch="render" {...props}>
    <span>Next</span>
    <ChevronRight className="size-4" />
  </PaginationLink>
);

const PaginationNextButton = ({ className, ...props }: React.ComponentProps<typeof PaginationButton>) => (
  <PaginationButton aria-label="Go to next page" size="default" className={cn("gap-1 pr-2.5", className)} {...props}>
    <span>Next</span>
    <ChevronRight className="size-4" />
  </PaginationButton>
);

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex size-9 items-center justify-center", className)} {...props}>
    <Ellipsis className="size-4" />
    <span className="sr-only">More pages</span>
  </span>
);

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  PaginationButton,
  PaginationPreviousButton,
  PaginationNextButton,
};
