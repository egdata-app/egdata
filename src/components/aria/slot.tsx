import * as React from "react";

import { cn } from "@/lib/utils";

type SlottableProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactElement<any>;
};

function Slot({ children, className, ...props }: SlottableProps) {
  return React.cloneElement(children, {
    ...props,
    ...children.props,
    className: cn(className, children.props.className),
  });
}

export { Slot };
