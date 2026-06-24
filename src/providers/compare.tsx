import { type ReactNode, useState, useEffect } from "react";
import { CompareContext } from "@/contexts/compare";

const normalizeCompareIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return Array.from(new Set(ids));
};

const safeParse = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    return normalizeCompareIds(JSON.parse(value));
  } catch {
    return [];
  }
};

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compare, setCompare] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFromSessionStorage = async () => {
      try {
        const storedCompare = sessionStorage.getItem("compare");
        const parsedCompare = safeParse(storedCompare);

        setCompare(parsedCompare);

        if (storedCompare && storedCompare !== JSON.stringify(parsedCompare)) {
          sessionStorage.setItem("compare", JSON.stringify(parsedCompare));
        }
      } catch (error) {
        console.error("Failed to load compare state", error);
        setCompare([]);
      }

      setIsLoading(false);
    };

    loadFromSessionStorage();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        sessionStorage.setItem("compare", JSON.stringify(normalizeCompareIds(compare)));
      } catch (error) {
        console.error("Failed to save compare state", error);
      }
    }
  }, [compare, isLoading]);

  const addToCompare = (id: string) => {
    setCompare((prev) => normalizeCompareIds([...prev, id]));
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
