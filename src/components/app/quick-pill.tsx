import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onRemove}
      className="h-7 gap-1.5 rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors duration-150 hover:border-primary/60 hover:bg-primary/20"
    >
      <span className="truncate max-w-[160px]">{label}</span>
      <XIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </Button>
  );
}
