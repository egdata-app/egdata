import * as React from "react";
import { Switch as AriaSwitch } from "react-aria-components";

import { cn } from "@/lib/utils";

function Switch({
  className,
  checked,
  onCheckedChange,
  disabled,
  isDisabled,
  ...props
}: Omit<React.ComponentProps<typeof AriaSwitch>, "isSelected" | "onChange" | "children" | "isDisabled"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <AriaSwitch
      isSelected={checked}
      isDisabled={isDisabled ?? disabled}
      onChange={onCheckedChange}
      className={cn(
        "group peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-stroke-default bg-surface-raised shadow-panel transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[selected]:border-interactive data-[selected]:bg-interactive data-[focus-visible]:ring-2 data-[focus-visible]:ring-interactive/35",
        className,
      )}
      {...(props as any)}
    >
      <span className="pointer-events-none block size-4 rounded-full bg-text-primary shadow-panel ring-0 transition-transform group-data-[selected]:translate-x-4 group-data-[selected]:bg-text-inverse" />
    </AriaSwitch>
  );
}

export { Switch };
