import * as React from "react";
import { Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type InputOTPContextValue = {
  value: string;
  activeIndex: number;
};

const InputOTPContext = React.createContext<InputOTPContextValue>({ value: "", activeIndex: 0 });

function InputOTP({
  className,
  containerClassName,
  value,
  onChange,
  maxLength = 6,
  children,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "children"> & {
  containerClassName?: string;
  value?: string;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = React.useState(value ?? "");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const currentValue = value ?? internalValue;

  const updateValue = (next: string) => {
    const normalized = next.replace(/\s/g, "").slice(0, Number(maxLength));
    setInternalValue(normalized);
    onChange?.(normalized);
  };

  return (
    <InputOTPContext.Provider value={{ value: currentValue, activeIndex: currentValue.length }}>
      <div
        className={cn("relative flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          value={currentValue}
          onChange={(event) => updateValue(event.target.value)}
          maxLength={maxLength}
          disabled={disabled}
          className={cn("absolute inset-0 z-10 opacity-0 disabled:cursor-not-allowed", className)}
          {...props}
        />
        {children}
      </div>
    </InputOTPContext.Provider>
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center", className)} {...props} />;
}

function InputOTPSlot({ index, className, ...props }: React.ComponentProps<"div"> & { index: number }) {
  const { value, activeIndex } = React.useContext(InputOTPContext);
  const char = value[index] ?? "";
  const isActive = activeIndex === index;

  return (
    <div
      className={cn(
        "relative flex size-9 items-center justify-center border-y border-r border-input text-sm shadow-panel transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className,
      )}
      {...props}
    >
      {char}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div role="separator" {...props}>
      <Minus />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
