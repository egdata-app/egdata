import { cn } from "@/lib/utils";
import { Button } from "@/components/aria/button";
import type { FullTag, TagCount } from "@/types/tags";

export function TagSelect({
  isSelected,
  handleSelect,
  tag,
  count,
}: {
  isSelected: boolean;
  handleSelect: (tag: string) => void;
  tag: FullTag;
  count?: TagCount;
}) {
  return (
    <Button
      variant="outline"
      onClick={() => handleSelect(tag.id)}
      className={cn(
        "rounded-lg inline-flex justify-between items-center gap-2 px-4 py-2 text-sm w-[250px]",
        isSelected
          ? "bg-surface-hover text-text-primary"
          : "bg-transparent text-text-primary hover:bg-surface-hover transition-colors duration-200 ease-in-out hover:text-text-primary",
      )}
    >
      <div className="inline-flex items-center justify-between w-full">
        <span>{tag.name}</span>
        {count && <span className="text-xs text-text-muted">{count.count}</span>}
      </div>
    </Button>
  );
}
