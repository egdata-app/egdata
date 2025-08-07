import { createFileRoute } from '@tanstack/react-router';
import { SimpleNotifications } from '@/components/simple-notifications';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Calendar, Users, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dehydrate, HydrationBoundary, useQuery } from '@tanstack/react-query';
import {
  checkSubscriptionStatusQuery,
  subscriptionsQuery,
} from '@/queries/push-notifications';

export const Route = createFileRoute('/notifications')({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();
    return (
      <HydrationBoundary state={dehydratedState}>
        <NotificationsPage />
      </HydrationBoundary>
    );
  },
  head: () => ({
    meta: [
      {
        title: 'Notifications - egdata.app',
      },
      {
        name: 'description',
        content:
          'Configure and manage push notifications for Epic Games Store updates, game releases, and more.',
      },
    ],
  }),
  loader: async ({ context }) => {
    const { queryClient } = context;
    const apiKey = context.cookies['push-notifications-api-key'];

    if (apiKey) {
      // Prefetch subscription status check
      await queryClient.prefetchQuery(checkSubscriptionStatusQuery(apiKey));

      // Prefetch subscriptions data
      await queryClient.prefetchQuery(subscriptionsQuery(apiKey));
    }

    return {
      dehydratedState: dehydrate(queryClient),
      apiKey,
    };
  },
});

function NotificationsPage() {
  const { apiKey } = Route.useLoaderData();

  // Use TanStack Query to get subscription status
  const { data: subscriptionStatus, error: subscriptionError } = useQuery({
    ...checkSubscriptionStatusQuery(apiKey || ''),
    enabled: !!apiKey,
  });

  // Use TanStack Query to get subscriptions data
  const { data: subscriptionsData, error: subscriptionsError } = useQuery({
    ...subscriptionsQuery(apiKey || ''),
    enabled: !!apiKey && !!subscriptionStatus, // Only fetch if subscribed
  });

  const isSubscribed = !!subscriptionStatus && !subscriptionError;
  const subscriptions = subscriptionsData?.subscriptions || [];
  const totalTopics = subscriptions.reduce((acc, sub) => acc + sub.topics.length, 0);
  const error = subscriptionError || subscriptionsError
    ? 'Failed to fetch subscriptions. Please try again.'
    : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Configure and manage push notifications for Epic Games Store updates,
          game releases, and personalized alerts.
        </p>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <SimpleNotifications />

          <Card>
            <CardHeader>
              <CardTitle>About Push Notifications</CardTitle>
              <CardDescription>
                Learn more about how push notifications work on EGData.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">What you'll receive:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>New free game announcements</li>
                  <li>Game release notifications</li>
                  <li>Price drop alerts for wishlisted games</li>
                  <li>Epic Games Store news and updates</li>
                  <li>Custom topic-based notifications</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Privacy & Security:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Your API key is stored securely in browser cookies</li>
                  <li>We only send notifications you've subscribed to</li>
                  <li>You can unsubscribe at any time</li>
                  <li>No personal data is required beyond your API key</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Browser Support:</h4>
                <p className="text-sm text-muted-foreground">
                  Push notifications are supported in modern browsers including
                  Chrome, Firefox, Safari, and Edge. Make sure to allow
                  notifications when prompted by your browser.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subscription Overview
              </CardTitle>
              <CardDescription>
                {isSubscribed
                  ? `Total subscribed topics: ${totalTopics}`
                  : 'API key is not subscribed to push notifications'}
              </CardDescription>
            </CardHeader>
          </Card>

          {!isSubscribed ? (
            !error && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Not Subscribed</h3>
                  <p className="text-muted-foreground">
                    Your API key is not subscribed to push notifications. Use
                    the "Setup & Subscribe" tab to subscribe first.
                  </p>
                </CardContent>
              </Card>
            )
          ) : subscriptions.length > 0 ? (
            subscriptions.map((subscription) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Subscription {subscription.id}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created:{' '}
                    {new Date(subscription.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Subscribed Topics:</h4>
                    <div className="flex flex-wrap gap-2">
                      {subscription.topics.length > 0 ? (
                        subscription.topics.map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No topics subscribed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last updated:{' '}
                    {new Date(subscription.updatedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  No Subscriptions Found
                </h3>
                <p className="text-muted-foreground">
                  You are subscribed but haven't created any device
                  subscriptions yet. Use the "Setup & Subscribe" tab to create
                  your first subscription.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
