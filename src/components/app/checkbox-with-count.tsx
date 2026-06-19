import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CheckboxWithCountProps {
  count?: number;
  label: string;
  checked: boolean | undefined;
  onChange: (checked: boolean) => void;
}

export function CheckboxWithCount({ count, label, checked, onChange }: CheckboxWithCountProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "group relative flex w-[95%] items-center justify-between rounded-lg px-4 py-2 text-sm",
        "border border-stroke-subtle transition-colors duration-300 ease-in-out",
        checked
          ? "bg-surface-panel hover:bg-surface-hover text-text-primary"
          : "bg-transparent hover:bg-surface-panel text-text-muted hover:text-text-secondary",
      )}
    >
      <div className="flex items-center gap-2 w-full overflow-hidden">
        <Check
          className={cn(
            "absolute left-4 size-4 transition-all duration-300 ease-in-out",
            checked ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
          )}
        />
        <span
          className={cn(
            "transition-all duration-300 ease-in-out",
            checked ? "translate-x-6" : "translate-x-0",
          )}
        >
          {label}
        </span>
      </div>
      {typeof count === "number" && (
        <span className="text-xs tabular-nums text-text-subtle ml-2">{count}</span>
      )}
    </button>
  );
}
