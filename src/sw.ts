/// <reference lib="webworker" />

import consola from 'consola';
import z, { type TypeOf } from 'zod';

declare const self: ServiceWorkerGlobalScope;

const notificationSchema = z.object({
  title: z.string(),
  body: z.string(),
  image: z.string().optional(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  actions: z
    .array(
      z.object({
        action: z.object({
          type: z.enum(['open', 'close']),
          url: z.string().optional(),
        }),
        title: z.string(),
        icon: z.string().optional(),
      }),
    )
    .optional(),
});

interface CustomNotificationAction {
  action: {
    type: 'open' | 'close';
    url?: string;
  };
  title: string;
  icon?: string;
}

interface ExtendedNotificationOptions extends NotificationOptions {
  image?: string;
  vibrate?: number[];
  actions?: { action: string; title: string; icon?: string }[];
  data?: {
    dateOfArrival: number;
    primaryKey: number;
    topic?: string;
    originalActions?: CustomNotificationAction[];
  };
}

// Push notification handler
self.addEventListener('push', (event: PushEvent) => {
  const defaultTitle = 'egdata.app Notification';
  let notificationTitle = defaultTitle;
  const options: ExtendedNotificationOptions = {
    body: 'New notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  if (event.data) {
    try {
      // Parse and validate the notification data using Zod schema
      const rawData = event.data.json();
      consola.info('Raw notification data:', rawData);
      const validationResult = notificationSchema.safeParse(rawData);

      if (validationResult.success) {
        const notification = validationResult.data;
        notificationTitle = notification.title || defaultTitle;
        options.body = notification.body || options.body;

        if (notification.icon) {
          options.icon = notification.icon;
        }

        if (notification.badge) {
          options.badge = notification.badge;
        }

        if (notification.image) {
          options.image = notification.image;
        }

        // Handle actions according to the validated schema
        if (notification.actions && Array.isArray(notification.actions)) {
          options.actions = notification.actions.map((actionItem, index) => ({
            action: `${actionItem.action.type}_${index}`,
            title: actionItem.title,
            icon: actionItem.icon,
          }));
        }

        // Store the original data for use in notification click handler
        const currentData = options.data || {
          dateOfArrival: Date.now(),
          primaryKey: 1,
        };
        options.data = {
          ...currentData,
          originalActions: notification.actions,
        };
      } else {
        console.error(
          'Invalid notification data format:',
          validationResult.error,
        );
        // Fall back to text content if validation fails
        options.body = event.data.text();
      }
    } catch (error) {
      console.error('Error parsing notification data:', error);
      // Fall back to text content if JSON parsing fails
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationTitle, options),
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const data = event.notification.data;
  const originalActions = data?.originalActions;

  consola.info('Notification clicked:', event.action);
  consola.info('Original actions:', originalActions);

  if (event.action) {
    // Extract action type and index from the action identifier
    const actionParts = event.action.split('_');
    const actionType = actionParts[0];
    const actionIndex = Number.parseInt(actionParts[1], 10);

    // Find the corresponding action from the original data
    const actionItem = originalActions?.[actionIndex];

    if (actionType === 'open') {
      // Handle open action with optional URL
      const url = actionItem?.action.url || '/';
      event.waitUntil(self.clients.openWindow(url));
    } else if (actionType === 'close') {
      // Handle close action - notification is already closed above
      return;
    }
  } else {
    // Handle default click (no specific action)
    // Try to find an 'open' action with URL, otherwise default to home
    const openAction = originalActions?.find(
      (item) => item.action.type === 'open',
    );
    const url = openAction?.action.url || '/';
    event.waitUntil(self.clients.openWindow(url));
  }
});

// Service worker lifecycle events
self.addEventListener('install', (_event: ExtendableEvent) => {
  console.debug('Service worker installed');
  // Service Worker skipping waiting phase immediately for simplicity
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.debug('Service worker activated');
  // Take control of all clients as soon as the SW is activated
  event.waitUntil(self.clients.claim());
});
