import { httpClient } from '@/lib/http-client';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Subscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  topics: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionsData {
  subscriptions: Subscription[];
  totalCount: number;
}

// Query to check if an API key is subscribed to push notifications
export const checkSubscriptionStatusQuery = (apiKey: string) =>
  queryOptions({
    queryKey: ['push-notifications', 'subscription-status', apiKey],
    queryFn: () =>
      httpClient.get('/push/subscribe', {
        headers: {
          'X-API-Key': apiKey,
        },
      }),
    enabled: !!apiKey,
    retry: false, // Don't retry on 404/error responses
  });

// Query to fetch user's push notification subscriptions
export const subscriptionsQuery = (apiKey: string) =>
  queryOptions({
    queryKey: ['push-notifications', 'subscriptions', apiKey],
    queryFn: () =>
      httpClient.get<SubscriptionsData>('/push/subscriptions', {
        headers: {
          'X-API-Key': apiKey,
        },
      }),
    enabled: !!apiKey,
  });

// Query to get VAPID public key
export const vapidPublicKeyQuery = queryOptions({
  queryKey: ['push-notifications', 'vapid-public-key'],
  queryFn: () => httpClient.get<{ publicKey: string }>('/push/vapid-public-key'),
});

// Mutation to subscribe to push notifications
export const useSubscribeMutation = (apiKey: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscriptionData: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }) => {
      return httpClient.post<{ id: string }>('/push/subscribe', subscriptionData, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
    },
    onSuccess: () => {
      // Invalidate subscription status and subscriptions queries
      queryClient.invalidateQueries({ queryKey: ['push-notifications', 'subscription-status', apiKey] });
      queryClient.invalidateQueries({ queryKey: ['push-notifications', 'subscriptions', apiKey] });
    },
  });
};

// Mutation to unsubscribe from push notifications
export const useUnsubscribeMutation = (apiKey: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      return httpClient.delete(`/push/unsubscribe/${subscriptionId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
    },
    onSuccess: () => {
      // Invalidate subscription status and subscriptions queries
      queryClient.invalidateQueries({ queryKey: ['push-notifications', 'subscription-status', apiKey] });
      queryClient.invalidateQueries({ queryKey: ['push-notifications', 'subscriptions', apiKey] });
    },
  });
};

// Mutation to subscribe to topics
export const useSubscribeToTopicMutation = (apiKey: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      subscriptionId: string;
      topics: string[];
    }) => {
      return httpClient.post('/push/topics/subscribe', data, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
    },
    onSuccess: () => {
      // Invalidate subscriptions query to refresh topic data
      queryClient.invalidateQueries({ queryKey: ['push-notifications', 'subscriptions', apiKey] });
    },
  });
};

// Mutation to unsubscribe from topics
export const useUnsubscribeFromTopicMutation = (apiKey: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      subscriptionId: string;
      topics: string[];
    }) => {
      return httpClient.post('/push/topics/unsubscribe', data, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
    },
    onSuccess: () => {
      // Invalidate subscriptions query to refresh topic data
      queryClient.invalidateQueries({ queryKey: ['push-notifications', 'subscriptions', apiKey] });
    },
  });
};