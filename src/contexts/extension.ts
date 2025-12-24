import { createContext } from "react";

export interface ExtensionContextType {
  ids: {
    id: string;
    namespace: string;
  }[];
  addId: (id: string, namespace: string) => void;
  removeId: (id: string, namespace: string) => void;
  clearIds: () => void;
  isOwned: (id: string, namespace: string) => boolean;
  ownedStatus: Record<string, boolean | undefined>;
}

export const ExtensionContext = createContext<ExtensionContextType>({
  ids: [],
  addId: () => {},
  removeId: () => {},
  clearIds: () => {},
  isOwned: () => false,
  ownedStatus: {},
});
