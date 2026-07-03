import * as TanStackRouter from "@tanstack/react-router";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { localizeHref } from "@/lib/paraglide-strategy";

type ParamsValue =
  | Record<string, unknown>
  | ((current: Record<string, unknown>) => Record<string, unknown>);

type LocalizedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to?: string;
  params?: ParamsValue;
  search?: unknown;
  hash?: string;
  preload?: unknown;
  activeProps?: unknown;
  inactiveProps?: unknown;
  resetScroll?: boolean;
  replace?: boolean;
  viewTransition?: unknown;
  from?: string;
  href?: string;
};

function shouldUseNativeAnchor(to: string) {
  return (
    to.startsWith("#") ||
    to.startsWith("mailto:") ||
    to.startsWith("tel:") ||
    to.includes("?") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(to)
  );
}

function bareLocaleParams(params: ParamsValue | undefined): ParamsValue {
  if (typeof params === "function") {
    return (current) => ({
      ...params(current),
      locale: undefined,
    });
  }

  return {
    ...params,
    locale: undefined,
  };
}

export const Link = forwardRef<HTMLAnchorElement, LocalizedLinkProps>(function Link(
  { to, href, params, children, ...props },
  ref,
) {
  const target = to ?? href ?? "";

  if (shouldUseNativeAnchor(target)) {
    return (
      <a ref={ref} href={localizeHref(target)} {...props}>
        {children}
      </a>
    );
  }

  const routeTo =
    target.startsWith("/") && !target.startsWith("/{-$locale}") ? `/{-$locale}${target}` : target;
  const routeParams = routeTo.startsWith("/{-$locale}") ? bareLocaleParams(params) : params;

  return (
    <TanStackRouter.Link
      ref={ref}
      to={routeTo as never}
      params={routeParams as never}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </TanStackRouter.Link>
  );
});
