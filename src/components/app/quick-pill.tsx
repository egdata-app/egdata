import { XIcon } from "lucide-react";
import { Button } from "@/components/aria/button";

export function QuickPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onRemove}
      className="rounded-lg px-3 py-1 text-xs bg-surface-hover text-text-primary h-7"
    >
      <span>{label}</span>
      <XIcon className="h-4 w-4" />
    </Button>
  );
}
