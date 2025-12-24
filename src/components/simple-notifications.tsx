import { useState, useEffect } from "react";
import { useCookies } from "react-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Loader2, Gift, GamepadIcon, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useQuery } from "@tanstack/react-query";
import { subscriptionsQuery } from "@/queries/push-notifications";
import { Checkbox } from "@/components/ui/checkbox";

// Generate a UUID v4
const generateUUID = (): string => {
  return window.crypto.randomUUID();
};

export function SimpleNotifications() {
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
    }
  }, [cookies]);

  const {
    isSupported,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    subscribeToTopic,
    unsubscribeFromTopic,
  } = usePushNotifications(apiKey);

  // Get subscription data to show current topics
  const { data: subscriptionsData } = useQuery({
    ...subscriptionsQuery(apiKey),
    enabled: !!apiKey,
  });

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
      return newApiKey;
    } catch (error) {
      showNotification("error", "Failed to generate API key");
      return null;
    }
  };

  const handleSubscribe = async () => {
    try {
      let currentApiKey = apiKey;

      // Generate API key if it doesn't exist
      if (!currentApiKey) {
        const newApiKey = generateApiKey();
        if (!newApiKey) return;
        currentApiKey = newApiKey;
      }

      // Subscribe to push notifications
      await subscribe();
      showNotification("success", "Successfully subscribed to notifications!");
    } catch (error) {
      showNotification("error", "Failed to subscribe to notifications");
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
      // Also clear the API key
      removeCookie("push-notifications-api-key", {
        path: "/",
        domain: import.meta.env.PROD ? ".egdata.app" : "localhost",
      });
      setApiKey("");
      showNotification("success", "Successfully unsubscribed from notifications");
    } catch (error) {
      showNotification("error", "Failed to unsubscribe from notifications");
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Push notifications are not supported in this browser.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const subscribedTopics = subscriptionsData?.subscriptions?.flatMap((sub) => sub.topics) || [];
  const totalTopics = subscribedTopics.length;

  // Predefined topics that users commonly want
  const availableTopics = [
    {
      id: "free-games",
      name: "Free Games",
      description: "Get notified when new free games are available",
      icon: Gift,
    },
    {
      id: "game-releases",
      name: "New Releases",
      description: "Notifications for new game releases",
      icon: GamepadIcon,
    },
    {
      id: "price-drops",
      name: "Price Drops",
      description: "Get alerts when games go on sale",
      icon: TrendingDown,
    },
  ];

  const handleTopicToggle = async (topicId: string, isCurrentlySubscribed: boolean) => {
    if (isCurrentlySubscribed) {
      const success = await unsubscribeFromTopic(topicId);
      if (success) {
        showNotification(
          "success",
          `Unsubscribed from ${availableTopics.find((t) => t.id === topicId)?.name}`,
        );
      } else {
        showNotification("error", "Failed to unsubscribe from topic");
      }
    } else {
      const success = await subscribeToTopic(topicId);
      if (success) {
        showNotification(
          "success",
          `Subscribed to ${availableTopics.find((t) => t.id === topicId)?.name}`,
        );
      } else {
        showNotification("error", "Failed to subscribe to topic");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          {isSubscribed
            ? `You're subscribed to ${totalTopics} notification topics`
            : "Get notified about Epic Games Store updates, free games, and more"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {!isSubscribed ? (
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Subscribe to Notifications
            </Button>
          ) : (
            <Button
              onClick={handleUnsubscribe}
              disabled={loading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              Unsubscribe
            </Button>
          )}
        </div>

        {notification && (
          <Alert variant={notification.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {isSubscribed && (
          <>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Choose what you want to be notified about:</h4>
              <div className="space-y-3">
                {availableTopics.map((topic) => {
                  const Icon = topic.icon;
                  const isTopicSubscribed = subscribedTopics.includes(topic.id);
                  return (
                    <div key={topic.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={topic.id}
                        checked={isTopicSubscribed}
                        onCheckedChange={() => handleTopicToggle(topic.id, isTopicSubscribed)}
                        disabled={loading}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={topic.id}
                          className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          <Icon className="h-4 w-4" />
                          {topic.name}
                        </label>
                        <p className="text-xs text-muted-foreground">{topic.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {subscribedTopics.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  You'll receive notifications for:{" "}
                  {subscribedTopics
                    .map((topic) => availableTopics.find((t) => t.id === topic)?.name || topic)
                    .join(", ")}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
