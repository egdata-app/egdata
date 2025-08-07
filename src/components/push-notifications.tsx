import { useState } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useQuery } from '@tanstack/react-query';
import { subscriptionsQuery } from '@/queries/push-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Loader2 } from 'lucide-react';

interface PushNotificationsProps {
  userApiKey: string;
}

export function PushNotifications({ userApiKey }: PushNotificationsProps) {
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe, subscribeToTopic, unsubscribeFromTopic } = usePushNotifications(userApiKey);
  const [topicInput, setTopicInput] = useState('');
  
  // Get subscription data to show current topics
  const { data: subscriptionsData } = useQuery({
    ...subscriptionsQuery(userApiKey),
    enabled: !!userApiKey && isSubscribed,
  });
  
  // Get all subscribed topics from the server data
  const subscribedTopics = subscriptionsData?.subscriptions?.flatMap(sub => sub.topics) || [];

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!userApiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Please set your API key to enable push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSubscribeToTopic = async () => {
    if (!topicInput.trim()) return;
    
    const success = await subscribeToTopic(topicInput.trim());
    if (success) {
      setTopicInput('');
    }
  };

  const handleUnsubscribeFromTopic = async (topic: string) => {
    await unsubscribeFromTopic(topic);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Manage your push notification preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Button 
              onClick={unsubscribe} 
              disabled={loading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <BellOff className="h-4 w-4" />
              Unsubscribe
            </Button>
          ) : (
            <Button 
              onClick={subscribe} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Bell className="h-4 w-4" />
              Subscribe
            </Button>
          )}
          <Badge variant={isSubscribed ? 'default' : 'secondary'}>
            {isSubscribed ? 'Subscribed' : 'Not subscribed'}
          </Badge>
        </div>

        {isSubscribed && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic-input">Subscribe to Topic</Label>
              <div className="flex gap-2">
                <Input
                  id="topic-input"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Enter topic name (e.g., game-updates)"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubscribeToTopic()}
                />
                <Button 
                  onClick={handleSubscribeToTopic}
                  disabled={!topicInput.trim()}
                  size="sm"
                >
                  Subscribe
                </Button>
              </div>
            </div>

            {subscribedTopics.length > 0 && (
              <div className="space-y-2">
                <Label>Subscribed Topics</Label>
                <div className="flex flex-wrap gap-2">
                  {subscribedTopics.map((topic) => (
                    <Badge 
                      key={topic} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleUnsubscribeFromTopic(topic)}
                    >
                      {topic} ×
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Click on a topic to unsubscribe
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}