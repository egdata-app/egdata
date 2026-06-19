import * as React from "react";
import { X } from "lucide-react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  Text,
} from "react-aria-components";

import { cn } from "@/lib/utils";
import { isNativeElement, PressableSlot } from "@/components/aria/pressable-slot";

type SheetSide = "top" | "right" | "bottom" | "left";

function Sheet({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children?: React.ReactNode }) {
  return (
    <AriaDialogTrigger isOpen={open} onOpenChange={onOpenChange}>
      {children}
    </AriaDialogTrigger>
  );
}

function SheetTrigger({ asChild, children, ...props }: React.ComponentProps<typeof AriaButton> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    if (isNativeElement(children)) {
      const { isDisabled, onPress, ...triggerProps } = props;
      return (
        <PressableSlot
          isDisabled={isDisabled}
          onPress={onPress as any}
          {...(triggerProps as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </PressableSlot>
      );
    }

    return React.cloneElement(children, props as React.HTMLAttributes<HTMLElement>);
  }
  return <AriaButton {...props}>{children}</AriaButton>;
}

function SheetClose({ asChild, children, ...props }: React.ComponentProps<typeof AriaButton> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { slot: "close", ...(props as React.HTMLAttributes<HTMLElement>) });
  }
  return <AriaButton slot="close" {...props}>{children}</AriaButton>;
}

function SheetPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof ModalOverlay>) {
  return <ModalOverlay className={cn("fixed inset-0 z-50 bg-surface-scrim backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0", className)} {...props} />;
}

const sheetSideClasses: Record<SheetSide, string> = {
  top: "inset-x-0 top-0 border-b data-[entering]:slide-in-from-top data-[exiting]:slide-out-to-top",
  bottom: "inset-x-0 bottom-0 border-t data-[entering]:slide-in-from-bottom data-[exiting]:slide-out-to-bottom",
  left: "inset-y-0 left-0 h-full w-3/4 border-r data-[entering]:slide-in-from-left data-[exiting]:slide-out-to-left sm:max-w-sm",
  right: "inset-y-0 right-0 h-full w-3/4 border-l data-[entering]:slide-in-from-right data-[exiting]:slide-out-to-right sm:max-w-sm",
};

function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Modal>, "children"> & {
  side?: SheetSide;
  children?: React.ReactNode;
}) {
  return (
    <SheetOverlay>
      <Modal
        className={cn(
          "fixed z-50 gap-4 bg-surface-overlay p-6 text-text-primary shadow-popover outline-none backdrop-blur-xl transition ease-in-out data-[entering]:duration-500 data-[exiting]:duration-300 data-[entering]:animate-in data-[exiting]:animate-out",
          sheetSideClasses[side],
          className,
        )}
        {...(props as any)}
      >
        <AriaDialog className="contents">
          <AriaButton slot="close" className="absolute top-4 right-4 rounded-sm text-text-muted transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-interactive/35 focus-visible:outline-none disabled:pointer-events-none">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </AriaButton>
          {children}
        </AriaDialog>
      </Modal>
    </SheetOverlay>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Heading>) {
  return <Heading slot="title" className={cn("text-lg font-semibold text-text-primary", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text slot="description" className={cn("text-sm text-text-muted", className)} {...props} />;
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
