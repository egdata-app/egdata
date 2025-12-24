import { useContext } from "react";
import { ExtensionContext } from "@/contexts/extension";
import type { ExtensionContextType } from "@/providers/extension";

export function useExtension(): ExtensionContextType {
  return useContext(ExtensionContext);
}

export default useExtension;
