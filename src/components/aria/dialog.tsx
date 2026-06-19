import * as React from "react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  Text,
} from "react-aria-components";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { isNativeElement, PressableSlot } from "@/components/aria/pressable-slot";

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <AriaDialogTrigger isOpen={open} onOpenChange={onOpenChange}>
      {children}
    </AriaDialogTrigger>
  );
}

function DialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof AriaButton> & { asChild?: boolean }) {
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

function DialogClose({ asChild, children, ...props }: React.ComponentProps<typeof AriaButton> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { slot: "close", ...(props as React.HTMLAttributes<HTMLElement>) });
  }
  return <AriaButton slot="close" {...props}>{children}</AriaButton>;
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof ModalOverlay>) {
  return (
    <ModalOverlay
      className={cn(
        "fixed inset-0 z-50 bg-surface-scrim backdrop-blur-sm data-[entering]:animate-in data-[entering]:fade-in-0 data-[exiting]:animate-out data-[exiting]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: Omit<React.ComponentProps<typeof Modal>, "children"> & {
  children?: React.ReactNode;
  showCloseButton?: boolean;
}) {
  return (
    <DialogOverlay>
      <Modal
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg egd-overlay p-6 outline-none duration-200 data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 sm:max-w-lg",
          className,
        )}
        {...(props as any)}
      >
        <AriaDialog className="contents">
          {children}
          {showCloseButton && (
            <AriaButton
              slot="close"
              className="absolute top-4 right-4 rounded-sm text-text-muted transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-interactive/35 focus-visible:outline-none disabled:pointer-events-none [&_svg]:size-4"
            >
              <X />
              <span className="sr-only">Close</span>
            </AriaButton>
          )}
        </AriaDialog>
      </Modal>
    </DialogOverlay>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof Heading>) {
  return <Heading slot="title" data-slot="dialog-title" className={cn("text-lg leading-none font-semibold text-text-primary", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text slot="description" data-slot="dialog-description" className={cn("text-sm text-text-muted", className)} {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
