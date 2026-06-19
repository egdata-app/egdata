import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type OpenReason = "click" | "focus" | "hover";
type NavigationMotion = "from-start" | "from-end" | "initial";

type NavigationMenuContextValue = {
  activeValue: string | null;
  closeValue: (value: string, immediate?: boolean) => void;
  getMotion: (value: string) => NavigationMotion;
  openValue: (value: string, reason?: OpenReason) => void;
  registerValue: (value: string) => () => void;
};

type NavigationMenuItemContextValue = {
  closeMenu: (immediate?: boolean) => void;
  motion: NavigationMotion;
  open: boolean;
  openMenu: (reason?: OpenReason) => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: string;
};

const NavigationMenuContext = React.createContext<NavigationMenuContextValue | null>(null);
const NavigationMenuItemContext = React.createContext<NavigationMenuItemContextValue | null>(null);

function composeEventHandlers<Event extends React.SyntheticEvent>(
  theirs: ((event: Event) => void) | undefined,
  ours: (event: Event) => void,
) {
  return (event: Event) => {
    theirs?.(event);
    if (!event.defaultPrevented) {
      ours(event);
    }
  };
}

function NavigationMenu({ className, onMouseLeave, ...props }: React.ComponentProps<"nav">) {
  const [activeValue, setActiveValue] = React.useState<string | null>(null);
  const [motion, setMotion] = React.useState<NavigationMotion>("initial");
  const activeValueRef = React.useRef<string | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const lastValueRef = React.useRef<string | null>(null);
  const valuesRef = React.useRef<string[]>([]);

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const registerValue = React.useCallback((value: string) => {
    if (!valuesRef.current.includes(value)) {
      valuesRef.current.push(value);
    }

    return () => {
      valuesRef.current = valuesRef.current.filter((itemValue) => itemValue !== value);
    };
  }, []);

  const openValue = React.useCallback(
    (value: string) => {
      clearCloseTimer();

      if (activeValueRef.current === value) {
        setActiveValue(value);
        return;
      }

      const previousValue = activeValueRef.current ?? lastValueRef.current;
      if (previousValue && previousValue !== value) {
        const previousIndex = valuesRef.current.indexOf(previousValue);
        const nextIndex = valuesRef.current.indexOf(value);
        setMotion(previousIndex < nextIndex ? "from-end" : "from-start");
      } else {
        setMotion("initial");
      }

      activeValueRef.current = value;
      lastValueRef.current = value;
      setActiveValue(value);
    },
    [clearCloseTimer],
  );

  const closeValue = React.useCallback(
    (value: string, immediate = false) => {
      clearCloseTimer();

      const close = () => {
        if (activeValueRef.current !== value) return;
        activeValueRef.current = null;
        setActiveValue(null);
        setMotion("initial");
      };

      if (immediate) {
        close();
        return;
      }

      closeTimerRef.current = window.setTimeout(() => {
        close();
        closeTimerRef.current = null;
      }, 180);
    },
    [clearCloseTimer],
  );

  const getMotion = React.useCallback(
    (value: string) => (activeValue === value ? motion : "initial"),
    [activeValue, motion],
  );

  React.useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const context = React.useMemo<NavigationMenuContextValue>(
    () => ({
      activeValue,
      closeValue,
      getMotion,
      openValue,
      registerValue,
    }),
    [activeValue, closeValue, getMotion, openValue, registerValue],
  );

  return (
    <NavigationMenuContext.Provider value={context}>
      <nav
        className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
        onMouseLeave={composeEventHandlers(onMouseLeave, () => {
          if (activeValueRef.current) {
            closeValue(activeValueRef.current);
          }
        })}
        {...props}
      />
    </NavigationMenuContext.Provider>
  );
}

function NavigationMenuList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  children,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  value,
  ...props
}: React.ComponentProps<"li"> & { value?: string }) {
  const generatedValue = React.useId();
  const menuValue = value ?? generatedValue;
  const menu = React.useContext(NavigationMenuContext);
  const open = menu?.activeValue === menuValue;

  React.useEffect(() => menu?.registerValue(menuValue), [menu, menuValue]);

  const openMenu = React.useCallback(
    (reason: OpenReason = "hover") => menu?.openValue(menuValue, reason),
    [menu, menuValue],
  );

  const closeMenu = React.useCallback(
    (immediate = false) => menu?.closeValue(menuValue, immediate),
    [menu, menuValue],
  );

  const setOpenSafely = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (nextOpen) => {
      if (typeof nextOpen === "function") {
        const resolvedOpen = nextOpen(open);
        if (resolvedOpen) openMenu("click");
        else closeMenu(true);
        return;
      }

      if (nextOpen) openMenu("click");
      else closeMenu(true);
    },
    [closeMenu, open, openMenu],
  );

  const context = React.useMemo<NavigationMenuItemContextValue>(
    () => ({
      closeMenu,
      motion: menu?.getMotion(menuValue) ?? "initial",
      open,
      openMenu,
      setOpen: setOpenSafely,
      value: menuValue,
    }),
    [closeMenu, menu, menuValue, open, openMenu, setOpenSafely],
  );

  return (
    <NavigationMenuItemContext.Provider value={context}>
      <li
        className={cn("group/navitem", className)}
        onMouseEnter={composeEventHandlers(onMouseEnter, () => openMenu("hover"))}
        onMouseLeave={composeEventHandlers(onMouseLeave, () => closeMenu())}
        onBlur={(event) => {
          onBlur?.(event);
          if (event.defaultPrevented) return;
          if (!event.currentTarget.contains(event.relatedTarget)) {
            closeMenu(true);
          }
        }}
        {...props}
      >
        {children}
      </li>
    </NavigationMenuItemContext.Provider>
  );
}

function navigationMenuTriggerStyle() {
  return "group inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-semibold text-text-secondary transition-[background-color,color,box-shadow] hover:bg-surface-hover hover:text-text-primary focus:bg-surface-hover focus:text-text-primary focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-surface-raised data-[state=open]:text-text-primary data-[state=open]:shadow-panel";
}

function NavigationMenuTrigger({
  className,
  children,
  onClick,
  onFocus,
  onMouseEnter,
  ...props
}: React.ComponentProps<"button">) {
  const context = React.useContext(NavigationMenuItemContext);
  const open = context?.open ?? false;
  const openMenu = context?.openMenu ?? (() => {});

  return (
    <button
      type="button"
      data-state={open ? "open" : "closed"}
      className={cn(navigationMenuTriggerStyle(), className)}
      onMouseEnter={composeEventHandlers(onMouseEnter, () => openMenu("hover"))}
      onFocus={composeEventHandlers(onFocus, () => openMenu("focus"))}
      onClick={composeEventHandlers(onClick, () => {
        openMenu("click");
      })}
      {...props}
    >
      {children}
      <ChevronDown
        className="relative top-px ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </button>
  );
}

function NavigationMenuContent({
  className,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<"div">) {
  const context = React.useContext(NavigationMenuItemContext);
  if (!context?.open) return null;

  return (
    <div
      data-motion={context.motion}
      data-slot="navigation-menu-content"
      data-state="open"
      className={cn(
        "absolute top-full left-0 mt-1.5 overflow-hidden rounded-lg egd-overlay will-change-[opacity,transform]",
        "data-[motion=initial]:animate-in data-[motion=initial]:fade-in-0 data-[motion=initial]:zoom-in-95",
        "data-[motion=from-start]:animate-in data-[motion=from-start]:fade-in-0 data-[motion=from-start]:slide-in-from-left-3",
        "data-[motion=from-end]:animate-in data-[motion=from-end]:fade-in-0 data-[motion=from-end]:slide-in-from-right-3",
        className,
      )}
      onMouseEnter={composeEventHandlers(onMouseEnter, () => context.openMenu("hover"))}
      onMouseLeave={composeEventHandlers(onMouseLeave, () => context.closeMenu())}
      {...props}
    />
  );
}

function NavigationMenuLink({
  asChild,
  children,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props as React.HTMLAttributes<HTMLElement>);
  }
  return <a {...props}>{children}</a>;
}

function NavigationMenuIndicator() {
  return null;
}

function NavigationMenuViewport() {
  return null;
}

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
