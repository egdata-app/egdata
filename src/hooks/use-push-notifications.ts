import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  checkSubscriptionStatusQuery,
  subscriptionsQuery,
  vapidPublicKeyQuery,
  useSubscribeMutation,
  useUnsubscribeMutation,
  useSubscribeToTopicMutation,
  useUnsubscribeFromTopicMutation,
} from '@/queries/push-notifications';
import { updateSW } from '@/registerSW';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications(userApiKey: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<(PushSubscription & { id?: string }) | null>(null);

  // TanStack Query hooks
  const { data: subscriptionStatus, error: subscriptionError } = useQuery({
    ...checkSubscriptionStatusQuery(userApiKey),
    enabled: !!userApiKey && isSupported,
  });

  const { data: subscriptionsData } = useQuery({
    ...subscriptionsQuery(userApiKey),
    enabled: !!userApiKey && isSupported,
  });

  const { data: vapidData } = useQuery(vapidPublicKeyQuery);

  // Mutations
  const subscribeMutation = useSubscribeMutation(userApiKey);
  const unsubscribeMutation = useUnsubscribeMutation(userApiKey);
  const subscribeToTopicMutation = useSubscribeToTopicMutation(userApiKey);
  const unsubscribeFromTopicMutation = useUnsubscribeFromTopicMutation(userApiKey);

  const isSubscribed = !!subscriptionsData?.subscriptions && subscriptionsData.subscriptions.length > 0;
  const loading = subscribeMutation.isPending || unsubscribeMutation.isPending || subscribeToTopicMutation.isPending || unsubscribeFromTopicMutation.isPending;

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
    
    // Service worker is automatically registered by vite-plugin-pwa
    // No manual registration needed
  }, []);

  const getServiceWorkerRegistration = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration;
      }
      return null;
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
      return null;
    }
  };

  const checkForServiceWorkerUpdate = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
  };

  // Update subscription state when subscriptions data changes
  useEffect(() => {
    if (subscriptionsData?.subscriptions && subscriptionsData.subscriptions.length > 0) {
      const firstSubscription = subscriptionsData.subscriptions[0];
      // We can't recreate the full PushSubscription object, but we can store the ID
      setSubscription({ id: firstSubscription.id } as PushSubscription & { id: string });
    } else {
      setSubscription(null);
    }
  }, [subscriptionsData]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

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
      throw new Error('Service worker not available');
    }
      
      // Get VAPID public key
      const publicKey = vapidData?.publicKey || VAPID_PUBLIC_KEY;
      
      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const p256dhKey = pushSubscription.getKey('p256dh');
      const authKey = pushSubscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }
      
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(authKey)))
        }
      };

      const response = await subscribeMutation.mutateAsync(subscriptionData);
      setSubscription({ id: response.id, ...pushSubscription });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  };

  const unsubscribe = async () => {
    if (!subscription?.id || !userApiKey) return;

    try {
      // Unsubscribe from server
      await unsubscribeMutation.mutateAsync(subscription.id);

      // Unsubscribe from browser if we have the full subscription object
      if ('unsubscribe' in subscription) {
        await subscription.unsubscribe();
      }
      
      setSubscription(null);
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  };

  const subscribeToTopic = async (topics: string | string[]) => {
    if (!subscription?.id || !userApiKey) return false;

    try {
      await subscribeToTopicMutation.mutateAsync({
        subscriptionId: subscription.id,
        topics: Array.isArray(topics) ? topics : [topics]
      });
      return true;
    } catch (error) {
      console.error('Error subscribing to topics:', error);
      return false;
    }
  };

  const unsubscribeFromTopic = async (topics: string | string[]) => {
    if (!subscription?.id || !userApiKey) return false;

    try {
      await unsubscribeFromTopicMutation.mutateAsync({
        subscriptionId: subscription.id,
        topics: Array.isArray(topics) ? topics : [topics]
      });
      return true;
    } catch (error) {
      console.error('Error unsubscribing from topics:', error);
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
    checkForServiceWorkerUpdate
  };
}