import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "android-beta-banner-dismissed";

export function AndroidBetaBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 text-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="flex-1 text-center">
          Join the Android closed beta!{" "}
          <Link to="/android-beta" className="underline font-semibold">
            Register now
          </Link>{" "}
          to get early access to the egdata.app mobile app.
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="shrink-0 size-6 hover:bg-primary-foreground/20"
          aria-label="Dismiss banner"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
