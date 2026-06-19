import * as React from "react";
import { Pressable, type PressEvent } from "react-aria-components";

import { cn } from "@/lib/utils";

type PressableSlotProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactElement<any>;
  isDisabled?: boolean;
  onPress?: (event: PressEvent) => void;
};

const nativeDisabledElements = new Set(["button", "input", "select", "textarea"]);

const PressableSlot = React.forwardRef<HTMLElement, PressableSlotProps>(function PressableSlot(
  { children, className, isDisabled, onPress, ...props },
  ref,
) {
  const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement> & {
    disabled?: boolean;
  }>;
  const childProps = child.props;
  const disabledProps = isDisabled
    ? typeof child.type === "string" && nativeDisabledElements.has(child.type)
      ? { disabled: true }
      : { "aria-disabled": true }
    : {};
  const clonedChild = React.cloneElement(child, {
    ...props,
    ...childProps,
    ...disabledProps,
    className: cn(className, childProps.className),
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <Pressable isDisabled={isDisabled} onPress={onPress} ref={ref as React.Ref<any>}>
      {clonedChild as any}
    </Pressable>
  );
});

function isNativeElement(children: React.ReactNode): children is React.ReactElement<any, string> {
  return React.isValidElement(children) && typeof children.type === "string";
}

export { PressableSlot, isNativeElement };
