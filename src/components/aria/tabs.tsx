import * as React from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  baseId: string;
  selectedValue: string;
  setSelectedValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used within <Tabs>");
  return context;
}

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const baseId = React.useId();
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? value ?? "");
  const [optimisticValue, setOptimisticValue] = React.useState(value ?? defaultValue ?? "");

  React.useEffect(() => {
    if (value !== undefined) {
      setOptimisticValue(value);
    }
  }, [value]);

  const selectedValue = value !== undefined ? optimisticValue : internalValue;

  const setSelectedValue = React.useCallback(
    (next: string) => {
      setOptimisticValue(next);
      if (value === undefined) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    },
    [onValueChange, value],
  );

  return (
    <TabsContext.Provider value={{ baseId, selectedValue, setSelectedValue }}>
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center rounded-md border border-stroke-subtle bg-surface-raised p-1 text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  value,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const { baseId, selectedValue, setSelectedValue } = useTabsContext();
  const selected = selectedValue === value;
  const triggerId = `${baseId}-${value}-trigger`;
  const panelId = `${baseId}-${value}-panel`;

  return (
    <button
      {...props}
      type="button"
      role="tab"
      id={triggerId}
      aria-controls={panelId}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-selected={selected ? "" : undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-semibold outline-none transition-all disabled:pointer-events-none disabled:opacity-50 hover:text-text-primary data-[selected]:bg-surface-active data-[selected]:text-text-primary data-[selected]:shadow-panel focus-visible:ring-2 focus-visible:ring-interactive/35",
        className,
      )}
      onClick={(event) => {
        setSelectedValue(value);
        onClick?.(event);
      }}
    />
  );
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const { baseId, selectedValue } = useTabsContext();
  if (selectedValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-${value}-panel`}
      aria-labelledby={`${baseId}-${value}-trigger`}
      className={cn(
        "mt-2 outline-none focus-visible:ring-2 focus-visible:ring-interactive/35",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
