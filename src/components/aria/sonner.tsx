import {
  Button,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type AppToast = {
  title: string;
  tone?: "success" | "error" | "default";
};

const queue = new ToastQueue<AppToast>({
  maxVisibleToasts: 4,
});

const toast = {
  success: (title: string) => queue.add({ title, tone: "success" }, { timeout: 5000 }),
  error: (title: string) => queue.add({ title, tone: "error" }, { timeout: 7000 }),
  message: (title: string) => queue.add({ title, tone: "default" }, { timeout: 5000 }),
};

function Toaster() {
  return (
    <AriaToastRegion
      queue={queue}
      className="fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none"
    >
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className={cn(
            "flex items-center gap-3 rounded-md border bg-background p-4 text-foreground shadow-raised outline-none data-[entering]:animate-in data-[entering]:slide-in-from-bottom-2 data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:slide-out-to-right data-[exiting]:fade-out-0",
            toast.content.tone === "success" && "border-success/40",
            toast.content.tone === "error" && "border-destructive/50",
          )}
        >
          <AriaToastContent className="min-w-0 flex-1">
            <Text slot="title" className="text-sm font-medium">
              {toast.content.title}
            </Text>
          </AriaToastContent>
          <Button slot="close" className="rounded-sm opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}

export { Toaster, toast, queue };
