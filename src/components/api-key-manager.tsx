import { useState, useEffect } from "react";
import { useCookies } from "react-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, CheckCircle, AlertCircle, RefreshCw, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/paraglide-react";

interface ApiKeyManagerProps {
  onApiKeyChange: (apiKey: string) => void;
}

// Generate a UUID v4
const generateUUID = (): string => {
  return window.crypto.randomUUID();
};

export function ApiKeyManager({ onApiKeyChange }: ApiKeyManagerProps) {
  const { t } = useTranslation();
  const [cookies, setCookie, removeCookie] = useCookies(["push-notifications-api-key"]);
  const [apiKey, setApiKey] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    // Load API key from cookies on component mount
    const savedApiKey = cookies["push-notifications-api-key"];
    if (savedApiKey) {
      setApiKey(savedApiKey);
      onApiKeyChange(savedApiKey);
    }
  }, [cookies, onApiKeyChange]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateApiKey = () => {
    const newApiKey = generateUUID();
    try {
      setCookie("push-notifications-api-key", newApiKey, {
        path: "/",
        maxAge: 31536000 * 100, // 100 years
        sameSite: "lax",
        domain: import.meta.env.PROD ? ".egdata.app" : "localhost",
      });
      setApiKey(newApiKey);
      onApiKeyChange(newApiKey);
      showNotification("success", t("components.apiKeyManager.notification.generated"));
    } catch {
      showNotification("error", t("components.apiKeyManager.notification.generateFailed"));
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) {
      showNotification("error", t("components.apiKeyManager.notification.noneToCopy"));
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey);
      showNotification("success", t("components.apiKeyManager.notification.copied"));
    } catch {
      showNotification("error", t("components.apiKeyManager.notification.copyFailed"));
    }
  };

  const handleClearApiKey = () => {
    try {
      removeCookie("push-notifications-api-key", {
        path: "/",
        domain: import.meta.env.PROD ? ".egdata.app" : "localhost",
      });
      setApiKey("");
      onApiKeyChange("");
      showNotification("success", t("components.apiKeyManager.notification.cleared"));
    } catch {
      showNotification("error", t("components.apiKeyManager.notification.clearFailed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t("components.apiKeyManager.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">{t("components.apiKeyManager.label")}</Label>
          <div className="flex gap-2">
            <Input
              id="api-key"
              type="text"
              placeholder={
                apiKey
                  ? t("components.apiKeyManager.placeholder.generated")
                  : t("components.apiKeyManager.placeholder.none")
              }
              value={apiKey}
              readOnly
              className={cn(
                "flex-1 font-mono text-sm transition-all duration-200 hover:blur-none",
                apiKey ? "blur-xs" : "blur-none",
              )}
            />
            <Button onClick={copyApiKey} size="sm" variant="outline" disabled={!apiKey}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={generateApiKey} size="sm" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            {apiKey
              ? t("components.apiKeyManager.button.regenerate")
              : t("components.apiKeyManager.button.generate")}
          </Button>
          {apiKey && (
            <Button onClick={handleClearApiKey} variant="destructive" size="sm">
              {t("components.apiKeyManager.button.clear")}
            </Button>
          )}
        </div>

        {notification && (
          <Alert variant={notification.type === "error" ? "destructive" : "default"}>
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {apiKey && (
          <div className="text-sm text-muted-foreground">
            {t("components.apiKeyManager.description")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
