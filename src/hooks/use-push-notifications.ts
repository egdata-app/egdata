import { useState, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  checkSubscriptionStatusQuery,
  subscriptionsQuery,
  vapidPublicKeyQuery,
  useSubscribeMutation,
  useUnsubscribeMutation,
  useSubscribeToTopicMutation,
  useUnsubscribeFromTopicMutation,
} from "@/queries/push-notifications";
import consola from "consola";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications(userApiKey: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<(PushSubscription & { id?: string }) | null>(
    null,
  );

  // Use useQueries to batch all queries together
  const queries = useQueries({
    queries: [
      {
        ...checkSubscriptionStatusQuery(userApiKey),
        enabled: !!userApiKey && isSupported,
      },
      {
        ...subscriptionsQuery(userApiKey),
        enabled: !!userApiKey && isSupported,
      },
      vapidPublicKeyQuery,
    ],
  });

  const [subscriptionStatusQuery, subscriptionsDataQuery, vapidDataQuery] = queries;
  const subscriptionStatus = subscriptionStatusQuery.data;
  const subscriptionError = subscriptionStatusQuery.error;
  const subscriptionsData = subscriptionsDataQuery.data;
  const vapidData = vapidDataQuery.data;

  // Mutations
  const subscribeMutation = useSubscribeMutation(userApiKey);
  const unsubscribeMutation = useUnsubscribeMutation(userApiKey);
  const subscribeToTopicMutation = useSubscribeToTopicMutation(userApiKey);
  const unsubscribeFromTopicMutation = useUnsubscribeFromTopicMutation(userApiKey);

  // Derived state - more reliable subscription status
  const hasSubscriptionData = !!subscriptionsData?.subscriptions?.length;
  const hasSubscriptionStatus = !!subscriptionStatus && !subscriptionError;

  // Get subscription ID when available
  const subscriptionId = subscriptionsData?.subscriptions?.[0]?.id || null;

  // Get subscribed topics from subscription data
  const subscribedTopics = subscriptionsData?.subscriptions?.flatMap((sub) => sub.topics) || [];

  // Only consider subscribed if we have actual subscription data with ID
  // The status check alone is not sufficient for topic operations
  const isSubscribed = hasSubscriptionData;

  // Check if queries are still loading
  const queriesLoading = queries.some((query) => query.isLoading);

  // Check if we have enough data for topic operations
  const canPerformTopicOperations = !!subscriptionId && !!userApiKey && !queriesLoading;

  // Function to check if user can subscribe to a specific topic
  const canSubscribeToTopic = (topic: string): boolean => {
    if (!canPerformTopicOperations) return false;
    return !subscribedTopics.includes(topic);
  };

  // Function to check if user is subscribed to a specific topic
  const isSubscribedToTopic = (topic: string): boolean => {
    return subscribedTopics.includes(topic);
  };

  const loading =
    subscribeMutation.isPending ||
    unsubscribeMutation.isPending ||
    subscribeToTopicMutation.isPending ||
    unsubscribeFromTopicMutation.isPending ||
    queriesLoading;

  useEffect(() => {
    setIsSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  const getServiceWorkerRegistration = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration;
      }
      return null;
    } catch (error) {
      console.error("Failed to get service worker registration:", error);
      return null;
    }
  };

  // Update subscription state when subscriptions data changes
  useEffect(() => {
    if (hasSubscriptionData) {
      const firstSubscription = subscriptionsData.subscriptions[0];
      // We can't recreate the full PushSubscription object, but we can store the ID
      setSubscription({ id: firstSubscription.id } as PushSubscription & {
        id: string;
      });
    } else {
      setSubscription(null);
    }
  }, [hasSubscriptionData, subscriptionsData]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    if (!isSupported || !userApiKey) return;

    try {
      // Get service worker registration
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        throw new Error("Service worker not available");
      }

      // Get VAPID public key
      const publicKey = vapidData?.publicKey || VAPID_PUBLIC_KEY;

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const p256dhKey = pushSubscription.getKey("p256dh");
      const authKey = pushSubscription.getKey("auth");

      if (!p256dhKey || !authKey) {
        throw new Error("Failed to get subscription keys");
      }

      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(authKey))),
        },
      };

      const response = await subscribeMutation.mutateAsync(subscriptionData);
      setSubscription({ id: response.id, ...pushSubscription });
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
    }
  };

  const unsubscribe = async () => {
    if (!subscriptionId || !userApiKey) {
      consola.error("Cannot unsubscribe: missing subscription ID or API key", {
        subscriptionId,
        hasApiKey: !!userApiKey,
      });
      return;
    }

    try {
      // Unsubscribe from server
      await unsubscribeMutation.mutateAsync(subscriptionId);

      // Unsubscribe from browser if we have the full subscription object
      if (subscription && "unsubscribe" in subscription) {
        await subscription.unsubscribe();
      }

      setSubscription(null);
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
    }
  };

  const subscribeToTopic = async (topics: string | string[]) => {
    if (!canPerformTopicOperations) {
      consola.error("Cannot subscribe to topic: not ready for topic operations", {
        subscriptionId,
        hasApiKey: !!userApiKey,
        hasSubscriptionData,
        hasSubscriptionStatus,
        isSubscribed,
        queriesLoading,
        canPerformTopicOperations,
        subscriptionStatus,
        subscriptionsData: subscriptionsData ? "present" : "missing",
        subscriptionsCount: subscriptionsData?.subscriptions?.length || 0,
      });
      return false;
    }

    try {
      await subscribeToTopicMutation.mutateAsync({
        subscriptionId,
        topics: Array.isArray(topics) ? topics : [topics],
      });
      return true;
    } catch (error) {
      console.error("Error subscribing to topics:", error);
      return false;
    }
  };

  const unsubscribeFromTopic = async (topics: string | string[]) => {
    if (!canPerformTopicOperations) {
      consola.error("Cannot unsubscribe from topic: not ready for topic operations", {
        subscriptionId,
        hasApiKey: !!userApiKey,
        hasSubscriptionData,
        hasSubscriptionStatus,
        isSubscribed,
        queriesLoading,
        canPerformTopicOperations,
      });
      return false;
    }

    try {
      await unsubscribeFromTopicMutation.mutateAsync({
        subscriptionId,
        topics: Array.isArray(topics) ? topics : [topics],
      });
      return true;
    } catch (error) {
      console.error("Error unsubscribing from topics:", error);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    subscribeToTopic,
    unsubscribeFromTopic,
    subscription,
    userApiKey,
    // Topic-related functions and data
    subscribedTopics,
    canSubscribeToTopic,
    isSubscribedToTopic,
    // Debug information
    subscriptionId,
    hasSubscriptionData,
    hasSubscriptionStatus,
    queriesLoading,
    canPerformTopicOperations,
  };
}
