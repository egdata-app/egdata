import { Link, useLocation } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { localeFromPathname } from "@/lib/paraglide-strategy";

type TechnologyLinkProps = Omit<ComponentProps<typeof Link>, "to" | "params" | "children"> & {
  id: string;
  children: ReactNode;
};

export function TechnologyLink({ id, children, ...props }: TechnologyLinkProps) {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);

  return (
    <Link to="/{-$locale}/technologies/$id" params={{ locale, id } as never} {...props}>
      {children}
    </Link>
  );
}
