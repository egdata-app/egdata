import { createFileRoute } from "@tanstack/react-router";
import { SimpleNotifications } from "@/components/simple-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Calendar, Users, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { checkSubscriptionStatusQuery, subscriptionsQuery } from "@/queries/push-notifications";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/notifications")({
  component: () => <NotificationsPage />,
  head: () => ({
    meta: [
      {
        title: i18n.t("notifications.meta.title"),
      },
      {
        name: "description",
        content: i18n.t("notifications.meta.description"),
      },
    ],
  }),
  loader: async ({ context }) => {
    const { queryClient } = context;
    const apiKey = context.cookies?.["push-notifications-api-key"];

    if (apiKey) {
      await queryClient.prefetchQuery(checkSubscriptionStatusQuery(apiKey));
      await queryClient.prefetchQuery(subscriptionsQuery(apiKey));
    }

    return {
      apiKey,
    };
  },
});

function NotificationsPage() {
  const { t } = useTranslation();
  const { apiKey } = Route.useLoaderData();

  const { data: subscriptionStatus, error: subscriptionError } = useQuery({
    ...checkSubscriptionStatusQuery(apiKey || ""),
    enabled: !!apiKey,
  });

  const { data: subscriptionsData, error: subscriptionsError } = useQuery({
    ...subscriptionsQuery(apiKey || ""),
    enabled: !!apiKey && !!subscriptionStatus,
  });

  const isSubscribed = !!subscriptionStatus && !subscriptionError;
  const subscriptions = subscriptionsData?.subscriptions || [];
  const totalTopics = subscriptions.reduce((acc, sub) => acc + sub.topics.length, 0);
  const error = subscriptionError || subscriptionsError ? t("notifications.fetchError") : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-8 w-8" />
          <h1 className="text-3xl font-bold">{t("notifications.title")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("notifications.description")}</p>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("notifications.tabs.notifications")}
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("notifications.tabs.mySubscriptions")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <SimpleNotifications />

          <Card>
            <CardHeader>
              <CardTitle>{t("notifications.aboutPushTitle")}</CardTitle>
              <CardDescription>{t("notifications.aboutPushDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t("notifications.whatYoullReceive")}</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("notifications.receiveList.freeGames")}</li>
                  <li>{t("notifications.receiveList.releases")}</li>
                  <li>{t("notifications.receiveList.priceDrops")}</li>
                  <li>{t("notifications.receiveList.news")}</li>
                  <li>{t("notifications.receiveList.custom")}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t("notifications.privacySecurity")}</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("notifications.privacyList.apiKey")}</li>
                  <li>{t("notifications.privacyList.onlySubscribed")}</li>
                  <li>{t("notifications.privacyList.unsubscribe")}</li>
                  <li>{t("notifications.privacyList.noPersonalData")}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t("notifications.browserSupport")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.browserSupportBody")}
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
                {t("notifications.subscriptionOverview")}
              </CardTitle>
              <CardDescription>
                {isSubscribed
                  ? t("notifications.totalSubscribed", { count: totalTopics })
                  : t("notifications.notSubscribedApi")}
              </CardDescription>
            </CardHeader>
          </Card>

          {!isSubscribed ? (
            !error && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t("notifications.notSubscribedTitle")}
                  </h3>
                  <p className="text-muted-foreground">{t("notifications.notSubscribedBody")}</p>
                </CardContent>
              </Card>
            )
          ) : subscriptions.length > 0 ? (
            subscriptions.map((subscription) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("notifications.subscriptionId", { id: subscription.id })}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("notifications.created")}{" "}
                    {new Date(subscription.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">{t("notifications.subscribedTopics")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {subscription.topics.length > 0 ? (
                        subscription.topics.map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t("notifications.noTopics")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t("notifications.lastUpdated")}{" "}
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
                  {t("notifications.noSubscriptionsTitle")}
                </h3>
                <p className="text-muted-foreground">{t("notifications.noSubscriptionsBody")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
