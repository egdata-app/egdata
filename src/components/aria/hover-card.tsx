import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type HoverCardContextValue = {
  close: (immediate?: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  id: string;
  isOpen: boolean;
  open: () => void;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
};

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

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

function HoverCard({
  children,
  closeDelay = 0,
  defaultOpen,
  open,
  openDelay = 0,
  onOpenChange,
}: {
  children?: React.ReactNode;
  closeDelay?: number;
  defaultOpen?: boolean;
  open?: boolean;
  openDelay?: number;
  onOpenChange?: (open: boolean) => void;
}) {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const openTimerRef = React.useRef<number | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const isOpen = open ?? uncontrolledOpen;

  const clearTimers = React.useCallback(() => {
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

    if (openDelay > 0) {
      openTimerRef.current = window.setTimeout(() => setOpen(true), openDelay);
      return;
    }

    setOpen(true);
  }, [clearTimers, openDelay, setOpen]);

  const hide = React.useCallback(
    (immediate = false) => {
      clearTimers();

      if (!immediate && closeDelay > 0) {
        closeTimerRef.current = window.setTimeout(() => setOpen(false), closeDelay);
        return;
      }

      setOpen(false);
    },
    [clearTimers, closeDelay, setOpen],
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

  const context = React.useMemo<HoverCardContextValue>(
    () => ({
      close: hide,
      contentRef,
      id,
      isOpen,
      open: show,
      setOpen,
      triggerRef,
    }),
    [hide, id, isOpen, setOpen, show],
  );

  return <HoverCardContext.Provider value={context}>{children}</HoverCardContext.Provider>;
}

const HoverCardTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean; children?: React.ReactNode }
>(function HoverCardTrigger({ asChild, children, className, ...props }, ref) {
  const context = React.useContext(HoverCardContext);
  const triggerProps: React.HTMLAttributes<HTMLElement> = {
    "aria-describedby": context?.isOpen ? context.id : undefined,
    onBlur: composeEventHandlers(props.onBlur, () => context?.close(true)),
    onFocus: composeEventHandlers(props.onFocus, () => context?.open()),
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
      className: cn(className, childProps.className),
      onBlur: composeEventHandlers(childProps.onBlur, triggerProps.onBlur as any),
      onFocus: composeEventHandlers(childProps.onFocus, triggerProps.onFocus as any),
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
    top = side === "top" ? triggerRect.top - contentRect.height - sideOffset : triggerRect.bottom + sideOffset;
  } else {
    left = side === "left" ? triggerRect.left - contentRect.width - sideOffset : triggerRect.right + sideOffset;
    if (align === "center") top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
    if (align === "end") top = triggerRect.bottom - contentRect.height;
  }

  const padding = 8;
  left = Math.min(Math.max(left, padding), window.innerWidth - contentRect.width - padding);
  top = Math.min(Math.max(top, padding), window.innerHeight - contentRect.height - padding);

  return { left: Math.round(left), top: Math.round(top) };
}

function HoverCardContent({
  align = "center",
  children,
  className,
  side = "top",
  sideOffset = 4,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: Align;
  side?: Side;
  sideOffset?: number;
}) {
  const context = React.useContext(HoverCardContext);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ left: -9999, top: -9999 });

  React.useEffect(() => setMounted(true), []);

  React.useLayoutEffect(() => {
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

  return createPortal(
    <div
      {...props}
      id={context.id}
      role="tooltip"
      data-placement={side}
      ref={context.contentRef}
      onPointerEnter={composeEventHandlers(props.onPointerEnter, () => context.open())}
      onPointerLeave={composeEventHandlers(props.onPointerLeave, () => context.close())}
      className={cn(
        "z-50 w-fit rounded-md egd-overlay animate-in fade-in-0 zoom-in-95",
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

export { HoverCard, HoverCardTrigger, HoverCardContent };
