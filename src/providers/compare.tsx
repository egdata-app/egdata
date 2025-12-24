import { type ReactNode, useState, useEffect } from "react";
import { CompareContext } from "@/contexts/compare";

const safeParse = (value: string | null): string[] => {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
};

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compare, setCompare] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFromSessionStorage = async () => {
      const storedCompare = sessionStorage.getItem("compare");
      if (storedCompare) {
        setCompare(safeParse(storedCompare));
      }
      setIsLoading(false);
    };

    loadFromSessionStorage();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Only save if not loading initial data
      sessionStorage.setItem("compare", JSON.stringify(compare));
    }
  }, [compare, isLoading]);

  const addToCompare = (id: string) => {
    setCompare((prev) => [...prev, id]);
  };

  const removeFromCompare = (id: string) => {
    setCompare((prev) => prev.filter((item) => item !== id));
  };

  return (
    <CompareContext.Provider value={{ compare, addToCompare, removeFromCompare }}>
      {children}
    </CompareContext.Provider>
  );
}
