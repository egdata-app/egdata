import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/aria/dialog";

type CommandContextValue = {
  query: string;
  setQuery: (query: string) => void;
};

const CommandContext = React.createContext<CommandContextValue | null>(null);

function useCommand() {
  return React.useContext(CommandContext);
}

function Command({ className, children, ...props }: React.ComponentProps<"div">) {
  const [query, setQuery] = React.useState("");

  return (
    <CommandContext.Provider value={{ query, setQuery }}>
      <div
        data-slot="command"
        className={cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className)}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

function CommandDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command>{children}</Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange"> & {
  onValueChange?: (value: string) => void;
}) {
  const command = useCommand();
  return (
    <div className="flex items-center border-b px-3">
      <Search className="mr-2 size-4 shrink-0 opacity-50" />
      <input
        className={cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)}
        onChange={(event) => {
          command?.setQuery(event.target.value);
          onValueChange?.(event.target.value);
        }}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-list" role="listbox" className={cn("max-h-[300px] overflow-x-hidden overflow-y-auto", className)} {...props} />;
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-empty" className={cn("py-6 text-center text-sm", className)} {...props} />;
}

function CommandGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-group" className={cn("overflow-hidden p-1 text-foreground", className)} {...props} />;
}

function CommandSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="command-separator" className={cn("-mx-1 h-px bg-border", className)} {...props} />;
}

function CommandItem({
  className,
  value,
  onSelect,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  value?: string;
  onSelect?: (value: string) => void;
}) {
  const command = useCommand();
  const text = value ?? (typeof children === "string" ? children : "");
  const hidden = command?.query && text && !text.toLowerCase().includes(command.query.toLowerCase());

  if (hidden) return null;

  return (
    <div
      data-slot="command-item"
      role="option"
      tabIndex={0}
      className={cn("relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50", className)}
      onClick={() => onSelect?.(text)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(text);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
