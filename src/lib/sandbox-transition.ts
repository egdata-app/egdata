import type { NavigateOptions } from "@tanstack/react-router";

/** Resolve the motion preference at navigation time, including changes made while browsing. */
export const sandboxViewTransition: Exclude<
  NavigateOptions["viewTransition"],
  boolean | undefined
> = {
  types: ({ pathChanged }) =>
    pathChanged && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? ["sandbox-tabs"]
      : false,
};
