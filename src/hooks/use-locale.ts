import { LocaleContext, type LocaleContextProps } from "@/contexts/locale";
import { useContext } from "react";

export const useLocale = (): LocaleContextProps => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};
