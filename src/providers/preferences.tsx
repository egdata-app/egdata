import { useEffect, useState } from "react";
import { PreferencesContext } from "@/contexts/preferences";
import { useCookies } from "react-cookie";
import { decode, encode } from "@/lib/preferences-encoding";

export interface Preferences {
  view: "grid" | "list";
}

export function PreferencesProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences?: Preferences;
}) {
  const [cookies, setCookies] = useCookies(["EGDATA_PREFERENCES"]);
  const [usrPref, setUsrPref] = useState<Preferences>(initialPreferences || { view: "grid" });

  useEffect(() => {
    if (cookies.EGDATA_PREFERENCES) {
      const preferences = JSON.parse(decode(cookies.EGDATA_PREFERENCES)) as Preferences;
      setUsrPref(preferences);
    }
  }, [cookies.EGDATA_PREFERENCES]);

  const setView = (view: "grid" | "list") => {
    const newPreferences = { ...usrPref, view };
    setUsrPref(newPreferences);
    setCookies("EGDATA_PREFERENCES", encode(JSON.stringify(newPreferences)));
  };

  return (
    <PreferencesContext.Provider value={{ view: usrPref.view, setView }}>
      {children}
    </PreferencesContext.Provider>
  );
}
