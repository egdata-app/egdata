import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/aria/button";

type CarouselEvent = "select" | "reInit" | "pointerDown";

type CarouselController = {
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
  selectedScrollSnap: () => number;
  scrollSnapList: () => number[];
  canScrollPrev: () => boolean;
  canScrollNext: () => boolean;
  containerNode: () => HTMLElement;
  on: (event: CarouselEvent, handler: () => void) => void;
  off: (event: CarouselEvent, handler: () => void) => void;
};

type CarouselApi = CarouselController;

type CarouselContextProps = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  orientation: "horizontal" | "vertical";
  controller: CarouselController | null;
  selectedIndex: number;
  count: number;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within a <Carousel />");
  return context;
}

function Carousel({
  orientation = "horizontal",
  setApi,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  opts?: unknown;
  plugins?: unknown;
  setApi?: (api: CarouselController) => void;
}) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const listeners = React.useRef<Record<CarouselEvent, Set<() => void>>>({
    select: new Set(),
    reInit: new Set(),
    pointerDown: new Set(),
  });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const emit = React.useCallback((event: CarouselEvent) => {
    listeners.current[event].forEach((handler) => handler());
  }, []);

  const getItems = React.useCallback(() => {
    const track = viewportRef.current?.firstElementChild;
    return track ? Array.from(track.children) as HTMLElement[] : [];
  }, []);

  const scrollTo = React.useCallback((index: number) => {
    const viewport = viewportRef.current;
    const item = getItems()[index];
    if (!viewport || !item) return;
    viewport.scrollTo({
      left: orientation === "horizontal" ? item.offsetLeft : viewport.scrollLeft,
      top: orientation === "vertical" ? item.offsetTop : viewport.scrollTop,
      behavior: "smooth",
    });
  }, [getItems, orientation]);

  const getCurrentIndex = React.useCallback(() => {
    const viewport = viewportRef.current;
    const items = getItems();
    if (!viewport || items.length === 0) return 0;
    const current = orientation === "horizontal" ? viewport.scrollLeft : viewport.scrollTop;
    return items.reduce((closest, item, index) => {
      const offset = orientation === "horizontal" ? item.offsetLeft : item.offsetTop;
      const closestOffset = orientation === "horizontal" ? items[closest].offsetLeft : items[closest].offsetTop;
      return Math.abs(offset - current) < Math.abs(closestOffset - current) ? index : closest;
    }, 0);
  }, [getItems, orientation]);

  const controller = React.useMemo<CarouselController>(() => ({
    scrollPrev: () => scrollTo(Math.max(0, getCurrentIndex() - 1)),
    scrollNext: () => scrollTo(Math.min(getItems().length - 1, getCurrentIndex() + 1)),
    scrollTo,
    selectedScrollSnap: getCurrentIndex,
    scrollSnapList: () => getItems().map((_, index) => index),
    canScrollPrev: () => getCurrentIndex() > 0,
    canScrollNext: () => getCurrentIndex() < getItems().length - 1,
    containerNode: () => viewportRef.current ?? document.body,
    on: (event, handler) => listeners.current[event].add(handler),
    off: (event, handler) => listeners.current[event].delete(handler),
  }), [getCurrentIndex, getItems, scrollTo]);

  React.useEffect(() => {
    setApi?.(controller);
  }, [controller, setApi]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      setCount(getItems().length);
      setSelectedIndex(getCurrentIndex());
      emit("select");
    };

    const onPointerDown = () => emit("pointerDown");
    update();
    emit("reInit");
    viewport.addEventListener("scroll", update, { passive: true });
    viewport.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", update);

    return () => {
      viewport.removeEventListener("scroll", update);
      viewport.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", update);
    };
  }, [emit, getCurrentIndex, getItems]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      controller.scrollPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      controller.scrollNext();
    }
  }, [controller]);

  return (
    <CarouselContext.Provider value={{ viewportRef, orientation, controller, selectedIndex, count }}>
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { viewportRef, orientation } = useCarousel();
  return (
    <div ref={viewportRef} className="overflow-hidden scroll-smooth" data-slot="carousel-content">
      <div
        className={cn(
          "flex snap-mandatory",
          orientation === "horizontal" ? "-ml-4 snap-x" : "-mt-4 snap-y flex-col",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel();
  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full snap-start",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className,
      )}
      {...props}
    />
  );
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, controller, selectedIndex } = useCarousel();
  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn("absolute size-8 rounded-full", orientation === "horizontal" ? "top-1/2 -left-12 -translate-y-1/2" : "-top-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!controller?.canScrollPrev()}
      onPress={() => controller?.scrollPrev()}
      data-index={selectedIndex}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, controller, selectedIndex, count } = useCarousel();
  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn("absolute size-8 rounded-full", orientation === "horizontal" ? "top-1/2 -right-12 -translate-y-1/2" : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!controller?.canScrollNext()}
      onPress={() => controller?.scrollNext()}
      data-index={selectedIndex}
      data-count={count}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

export {
  type CarouselApi,
  type CarouselController,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
};
