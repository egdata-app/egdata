import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectContextValue = {
  selectedValue?: string;
  selectedText?: React.ReactNode;
  open: boolean;
  label?: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedValue: (value: string) => void;
  registerItem: (value: string, text: React.ReactNode) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("Select components must be used within <Select>");
  return context;
}

function Select({
  value,
  defaultValue,
  onValueChange,
  children,
  "aria-label": ariaLabel,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? value);
  const [items, setItems] = React.useState<Record<string, React.ReactNode>>({});
  const selectedValue = value ?? internalValue;

  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const registerItem = React.useCallback((itemValue: string, text: React.ReactNode) => {
    setItems((current) => {
      if (current[itemValue] === text) return current;
      return { ...current, [itemValue]: text };
    });
  }, []);

  const setSelectedValue = React.useCallback(
    (next: string) => {
      if (value === undefined) {
        setInternalValue(next);
      }
      onValueChange?.(next);
      setOpen(false);
    },
    [onValueChange, value],
  );

  return (
    <SelectContext.Provider
      value={{
        selectedValue,
        selectedText: selectedValue ? items[selectedValue] : undefined,
        open,
        label: ariaLabel,
        setOpen,
        setSelectedValue,
        registerItem,
      }}
    >
      <div ref={rootRef} data-slot="select" className="relative inline-block" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function SelectValue({
  placeholder,
  className,
  children,
}: {
  placeholder?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const { selectedText, selectedValue } = useSelectContext();

  return (
    <span data-slot="select-value" className={className}>
      {children ?? selectedText ?? (selectedValue ? selectedValue : placeholder)}
    </span>
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  onClick,
  onKeyDown,
  "aria-label": ariaLabel,
  disabled,
  ...props
}: React.ComponentProps<"button"> & {
  size?: "sm" | "default";
}) {
  const { open, label, setOpen } = useSelectContext();
  const accessibleLabel = ariaLabel ?? label;

  return (
    <button
      type="button"
      data-slot="select-trigger"
      data-size={size}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={accessibleLabel}
      disabled={disabled}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-md border border-stroke-default bg-surface-raised px-3 py-2 text-sm text-text-primary whitespace-nowrap shadow-panel transition-[background-color,border-color,box-shadow,color] outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-text-subtle focus-visible:border-interactive focus-visible:ring-interactive/25 focus-visible:ring-[3px] data-[size=default]:h-9 data-[size=sm]:h-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-muted",
        className,
      )}
      onClick={(event) => {
        setOpen((current) => !current);
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
        }
        onKeyDown?.(event);
      }}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 opacity-50" />
    </button>
  );
}

function SelectContent({
  className,
  children,
  side,
  align = "center",
  ...props
}: React.ComponentProps<"div"> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const { open } = useSelectContext();
  if (!open) return null;

  return (
    <div
      data-slot="select-content"
      role="listbox"
      className={cn(
        "absolute z-50 max-h-96 min-w-full overflow-y-auto rounded-md egd-overlay p-1 outline-none animate-in fade-in-0 zoom-in-95",
        side === "top" ? "bottom-full mb-1" : "top-full mt-1",
        align === "end" && "right-0",
        align === "start" && "left-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted", className)} {...props} />;
}

function SelectItem({
  className,
  children,
  value,
  disabled,
  onClick,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const { selectedValue, setSelectedValue, registerItem } = useSelectContext();
  const selected = selectedValue === value;

  React.useEffect(() => {
    registerItem(value, children);
  }, [children, registerItem, value]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      data-selected={selected ? "" : undefined}
      className={cn(
        "group relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-left text-sm text-text-secondary outline-none select-none disabled:pointer-events-none disabled:opacity-50 hover:bg-surface-hover hover:text-text-primary focus:bg-surface-hover focus:text-text-primary data-[selected]:text-text-primary",
        className,
      )}
      onClick={(event) => {
        setSelectedValue(value);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
      <span className="absolute right-2 hidden size-3.5 items-center justify-center group-data-[selected]:flex">
        <Check className="size-4" />
      </span>
    </button>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("-mx-1 my-1 h-px bg-stroke-subtle", className)} {...props} />;
}

function SelectScrollUpButton() {
  return null;
}

function SelectScrollDownButton() {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
