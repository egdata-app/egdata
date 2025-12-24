import { internalNamespaces } from "@/lib/internal-namespaces";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

export function SandboxHeader({
  title,
  section,
  sandbox,
  id,
}: {
  title: string;
  section: string;
  id: string;
  sandbox: string;
}) {
  const isInternal = useMemo(() => internalNamespaces.includes(sandbox), [sandbox]);

  return (
    <h1 className="text-2xl font-medium flex flex-row items-end gap-2">
      <Link to="/sandboxes/$id" params={{ id }}>
        {isInternal ? "Internal Sandbox" : id === "ue" ? "Unreal Engine" : title}
      </Link>
      <span className="text-muted-foreground font-thin">/</span>
      <span className="text-xl font-extralight">{section}</span>
    </h1>
  );
}
