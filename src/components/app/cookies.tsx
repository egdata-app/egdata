import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCookies } from "@/hooks/use-cookies";
import { Link } from "@tanstack/react-router";
import type { ConsentSettings } from "./google-analytics";
import { Separator } from "../ui/separator";

export function CookieBanner() {
  const [showCustomize, setShowCustomize] = useState(false);
  const [selfHostedAnalytics, setSelfHostedAnalytics] = useState(true);
  const [googleAnalytics, setGoogleAnalytics] = useState(false);
  const [googleConsent, setGoogleConsent] = useState<ConsentSettings>({
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "denied",
  });
  const [ahrefsAnalytics, setAhrefsConsent] = useState(false);
  const { setSelection } = useCookies();

  const handleConsentChange = (key: keyof ConsentSettings, value: boolean) => {
    setGoogleConsent((prev) => ({
      ...prev,
      [key]: value ? "granted" : "denied",
    }));
  };

  const handleAcceptAll = () => {
    setSelection({
      googleAnalytics: true,
      selfHostedAnalytics: true,
      googleConsent: {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
        functionality_storage: "granted",
        personalization_storage: "granted",
        security_storage: "granted",
      },
      ahrefsAnalytics: true,
    });
  };

  const handleRequiredOnly = () => {
    setSelection({
      googleAnalytics: false,
      selfHostedAnalytics: true,
      googleConsent: {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        functionality_storage: "denied",
        personalization_storage: "denied",
        security_storage: "denied",
      },
      ahrefsAnalytics: false,
    });
  };

  const handleSavePreferences = () => {
    setSelection({
      googleAnalytics,
      selfHostedAnalytics,
      googleConsent,
      ahrefsAnalytics,
    });
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Cookie Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          We use cookies to enhance your browsing experience and analyze our traffic. Please choose
          your preferences below.
          <Link
            className="text-sm text-muted-foreground ml-2 mt-2 underline decoration-dotted decoration-muted-foreground"
            to="/privacy"
          >
            Learn more
          </Link>
        </p>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setShowCustomize(!showCustomize)}>
              {showCustomize ? "Hide Options" : "Customize"}
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleRequiredOnly}>
                Required Only
              </Button>
              <Button variant="default" onClick={handleAcceptAll}>
                Accept All
              </Button>
            </div>
          </div>
          {showCustomize && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="google-analytics" className="flex flex-col">
                  <span>Google Analytics</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Allow Google Analytics tracking
                  </span>
                </Label>
                <Switch
                  id="google-analytics"
                  checked={googleAnalytics}
                  onCheckedChange={(value) => setGoogleAnalytics(value as boolean)}
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <Label htmlFor="ahrefs-analytics" className="flex flex-col">
                  <span>Ahrefs Analytics</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Allow Ahrefs tracking
                  </span>
                </Label>
                <Switch
                  id="ahrefs-analytics"
                  checked={ahrefsAnalytics}
                  onCheckedChange={(value) => setAhrefsConsent(value as boolean)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="self-hosted-analytics" className="flex flex-col">
                  <span>Self-hosted Analytics</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Allow our own analytics tracking (always on)
                  </span>
                </Label>
                <Switch
                  id="self-hosted-analytics"
                  checked={selfHostedAnalytics}
                  onCheckedChange={setSelfHostedAnalytics}
                  disabled
                />
              </div>
              <Separator orientation="horizontal" />
              {Object.entries(googleConsent).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="flex flex-col">
                    <span>{key[0].toUpperCase() + key.slice(1).replace(/_/g, " ")}</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      {`Manage ${key.replace(/_/g, " ")} consent`}
                    </span>
                  </Label>
                  <Switch
                    id={key}
                    checked={value === "granted"}
                    onCheckedChange={(checked) =>
                      handleConsentChange(key as keyof ConsentSettings, checked)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      {showCustomize && (
        <CardFooter>
          <Button onClick={handleSavePreferences} className="w-full">
            Save Preferences
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
