import * as React from "react";
import {
  Button as AriaButton,
  Disclosure,
  DisclosurePanel,
} from "react-aria-components";

function Collapsible({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Disclosure> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <Disclosure isExpanded={open} onExpandedChange={onOpenChange} {...props} />;
}

function CollapsibleTrigger(props: React.ComponentProps<typeof AriaButton>) {
  return <AriaButton slot="trigger" {...props} />;
}

function CollapsibleContent(props: React.ComponentProps<typeof DisclosurePanel>) {
  return <DisclosurePanel {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
