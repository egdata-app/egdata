import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type TooltipContextValue = {
  close: (immediate?: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  disableHoverableContent: boolean;
  id: string;
  isOpen: boolean;
  open: () => void;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
};

type TooltipProps = {
  children?: React.ReactNode;
  closeDelay?: number;
  defaultOpen?: boolean;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  openDelay?: number;
};

type TooltipTriggerProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  children?: React.ReactNode;
};

type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: Align;
  side?: Side;
  sideOffset?: number;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  (ref as React.MutableRefObject<T | null>).current = value;
}

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (value: T | null) => {
    for (const ref of refs) assignRef(ref, value);
  };
}

function composeEventHandlers<Event extends React.SyntheticEvent>(
  theirs: ((event: Event) => void) | undefined,
  ours: (event: Event) => void,
) {
  return (event: Event) => {
    theirs?.(event);
    if (!event.defaultPrevented) ours(event);
  };
}

function mergeDescribedBy(current: unknown, tooltipId: string | undefined) {
  if (!tooltipId) return current as string | undefined;
  if (typeof current === "string" && current.trim().length > 0) {
    return `${current} ${tooltipId}`;
  }

  return tooltipId;
}

function Tooltip({
  children,
  closeDelay,
  defaultOpen,
  delayDuration = 0,
  disableHoverableContent = false,
  onOpenChange,
  open,
  openDelay,
}: TooltipProps) {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const openTimerRef = React.useRef<number | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const isOpen = open ?? uncontrolledOpen;
  const effectiveCloseDelay = closeDelay ?? (disableHoverableContent ? 0 : 100);

  const clearTimers = React.useCallback(() => {
    if (typeof window === "undefined") return;

    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const show = React.useCallback(() => {
    clearTimers();

    const delay = openDelay ?? delayDuration;
    if (delay > 0 && typeof window !== "undefined") {
      openTimerRef.current = window.setTimeout(() => setOpen(true), delay);
      return;
    }

    setOpen(true);
  }, [clearTimers, delayDuration, openDelay, setOpen]);

  const hide = React.useCallback(
    (immediate = false) => {
      clearTimers();

      if (!immediate && effectiveCloseDelay > 0 && typeof window !== "undefined") {
        closeTimerRef.current = window.setTimeout(() => setOpen(false), effectiveCloseDelay);
        return;
      }

      setOpen(false);
    },
    [clearTimers, effectiveCloseDelay, setOpen],
  );

  React.useEffect(() => clearTimers, [clearTimers]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide(true);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hide, isOpen]);

  const context = React.useMemo<TooltipContextValue>(
    () => ({
      close: hide,
      contentRef,
      disableHoverableContent,
      id,
      isOpen,
      open: show,
      setOpen,
      triggerRef,
    }),
    [disableHoverableContent, hide, id, isOpen, setOpen, show],
  );

  return <TooltipContext.Provider value={context}>{children}</TooltipContext.Provider>;
}

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(function TooltipTrigger(
  { asChild, children, className, ...props },
  ref,
) {
  const context = React.useContext(TooltipContext);
  const describedBy = mergeDescribedBy(props["aria-describedby"], context?.isOpen ? context.id : undefined);

  const triggerProps: React.HTMLAttributes<HTMLElement> = {
    "aria-describedby": describedBy,
    onBlur: composeEventHandlers(props.onBlur, () => context?.close(true)),
    onFocus: composeEventHandlers(props.onFocus, () => context?.open()),
    onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
      if (event.key === "Escape") context?.close(true);
    }),
    onPointerEnter: composeEventHandlers(props.onPointerEnter, () => context?.open()),
    onPointerLeave: composeEventHandlers(props.onPointerLeave, () => context?.close()),
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
    const childProps = child.props;
    const childRef = parseInt(React.version, 10) < 19 ? (child as any).ref : (childProps as any).ref;

    return React.cloneElement(child, {
      ...props,
      ...triggerProps,
      ...childProps,
      "aria-describedby": mergeDescribedBy(
        childProps["aria-describedby"] ?? props["aria-describedby"],
        context?.isOpen ? context.id : undefined,
      ),
      className: cn(className, childProps.className),
      onBlur: composeEventHandlers(childProps.onBlur, triggerProps.onBlur as any),
      onFocus: composeEventHandlers(childProps.onFocus, triggerProps.onFocus as any),
      onKeyDown: composeEventHandlers(childProps.onKeyDown, triggerProps.onKeyDown as any),
      onPointerEnter: composeEventHandlers(
        childProps.onPointerEnter,
        triggerProps.onPointerEnter as any,
      ),
      onPointerLeave: composeEventHandlers(
        childProps.onPointerLeave,
        triggerProps.onPointerLeave as any,
      ),
      ref: composeRefs(childRef, ref as React.Ref<HTMLElement>, context?.triggerRef),
    } as React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>);
  }

  return (
    <button
      type="button"
      className={className}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      {...(triggerProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      ref={composeRefs(ref as React.Ref<HTMLButtonElement>, context?.triggerRef as any)}
    >
      {children}
    </button>
  );
});

function calculatePosition({
  align,
  contentRect,
  side,
  sideOffset,
  triggerRect,
}: {
  align: Align;
  contentRect: DOMRect;
  side: Side;
  sideOffset: number;
  triggerRect: DOMRect;
}) {
  let left = triggerRect.left;
  let top = triggerRect.top;

  if (side === "top" || side === "bottom") {
    if (align === "center") left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
    if (align === "end") left = triggerRect.right - contentRect.width;
    top =
      side === "top"
        ? triggerRect.top - contentRect.height - sideOffset
        : triggerRect.bottom + sideOffset;
  } else {
    left =
      side === "left"
        ? triggerRect.left - contentRect.width - sideOffset
        : triggerRect.right + sideOffset;
    if (align === "center") top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
    if (align === "end") top = triggerRect.bottom - contentRect.height;
  }

  const padding = 8;
  const maxLeft = Math.max(padding, window.innerWidth - contentRect.width - padding);
  const maxTop = Math.max(padding, window.innerHeight - contentRect.height - padding);
  left = Math.min(Math.max(left, padding), maxLeft);
  top = Math.min(Math.max(top, padding), maxTop);

  return { left: Math.round(left), top: Math.round(top) };
}

function TooltipContent({
  align = "center",
  children,
  className,
  side = "top",
  sideOffset = 0,
  style,
  ...props
}: TooltipContentProps) {
  const context = React.useContext(TooltipContext);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ left: -9999, top: -9999 });

  React.useEffect(() => setMounted(true), []);

  useIsomorphicLayoutEffect(() => {
    if (!context?.isOpen || !context.triggerRef.current || !context.contentRef.current) return;

    const updatePosition = () => {
      const triggerRect = context.triggerRef.current?.getBoundingClientRect();
      const contentRect = context.contentRef.current?.getBoundingClientRect();
      if (!triggerRect || !contentRect) return;
      setPosition(calculatePosition({ align, contentRect, side, sideOffset, triggerRect }));
    };

    updatePosition();

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(context.contentRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, context, side, sideOffset]);

  if (!mounted || !context?.isOpen) return null;

  const hoverableContentHandlers = context.disableHoverableContent
    ? {}
    : {
        onPointerEnter: composeEventHandlers(props.onPointerEnter, () => context.open()),
        onPointerLeave: composeEventHandlers(props.onPointerLeave, () => context.close()),
      };

  return createPortal(
    <div
      {...props}
      {...hoverableContentHandlers}
      id={context.id}
      role="tooltip"
      data-placement={side}
      ref={context.contentRef}
      className={cn(
        "z-50 w-fit max-w-xs rounded-md border border-stroke-default bg-surface-overlay px-3 py-1.5 text-xs text-balance text-text-primary shadow-popover backdrop-blur-xl animate-in fade-in-0 zoom-in-95",
        className,
      )}
      style={{
        ...style,
        left: position.left,
        position: "fixed",
        top: position.top,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
