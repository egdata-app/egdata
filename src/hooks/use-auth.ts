import { useContext } from "react";
import { AuthContext } from "@/context/auth";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useCompare must be used within a AuthProvider");
  }
  return context;
};
