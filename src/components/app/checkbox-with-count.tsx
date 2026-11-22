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
        "group relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors duration-150",
        checked
          ? "border-primary/40 bg-primary/15 text-foreground"
          : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border transition-colors duration-150",
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/80 bg-background/50 text-transparent group-hover:border-primary/50",
          )}
        >
          <Check className="size-3" strokeWidth={2.5} />
        </span>
        <span className="truncate font-medium">{label}</span>
      </div>
      {typeof count === "number" && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground/80">
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
}
