import * as React from "react";
import { createPortal } from "react-dom";

function Portal({ children }: { children?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

const Root = Portal;

export { Portal, Root };
