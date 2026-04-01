// VCCA - Notifications Page
// Full-page notifications view with filtering
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NotificationItem } from '@/components/notifications/notification-item';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useClearNotifications,
} from '@/lib/queries';
import { PageHeader } from '@/components/layout/page-header';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

type NotificationFilter = 'all' | 'execution' | 'cost' | 'error' | 'system' | 'test';
type ConfirmAction = 'clear' | null;

const confirmConfig: Record<Exclude<ConfirmAction, null>, { title: string; description: string; action: string }> = { clear: { title: 'Clear all notifications?', description: 'This will permanently delete all notifications. This action cannot be undone.', action: 'Clear All' } };

export function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useNotifications(200);
  const { data: unreadCount } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const clearAll = useClearNotifications();

  const handleRefresh = () => {
    setIsRefreshing(true);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(200) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() }),
    ]).finally(() => setIsRefreshing(false));
  };

  const handleMarkRead = (notificationId: string) => {
    markRead.mutate(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleClearAll = () => {
    setConfirmAction('clear');
  };

  const executeConfirmedAction = () => {
    if (confirmAction === 'clear') {
      clearAll.mutate();
    }
    setConfirmAction(null);
  };

  const filteredNotifications = notifications?.filter((notification) => {
    if (filter === 'all') return true;
    return notification.notification_type === filter;
  }) || [];

  const anyMutationPending = markAllRead.isPending || clearAll.isPending;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-card/50">
          <PageHeader
            title="Notifications"
            description={
              unreadCount !== undefined && unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : undefined
            }
            icon={<Bell className="h-6 w-6 text-muted-foreground" />}
            actions={
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={anyMutationPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh notifications</TooltipContent>
                </Tooltip>
                {unreadCount !== undefined && unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={markAllRead.isPending}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark All Read
                  </Button>
                )}
                {notifications && notifications.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={clearAll.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </>
            }
          />
        </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)} className="flex-1 flex flex-col">
        <div className="px-6 pt-4 border-b border-border/50 bg-muted/20">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" className="relative">
              All
              {unreadCount !== undefined && unreadCount > 0 && filter === 'all' && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 h-4 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="error">Error</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        </div>

        {/* Content Area */}
        <TabsContent value={filter} className="flex-1 mt-0 focus-visible:outline-none focus-visible:ring-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No notifications
              </h3>
              <p className="text-sm text-muted-foreground/70">
                {filter === 'all'
                  ? "You're all caught up!"
                  : `No ${filter} notifications found.`}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-border/30">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleMarkRead(notification.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction && confirmConfig[confirmAction].title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && confirmConfig[confirmAction].description}
              {confirmAction === 'clear' && notifications && (
                <>
                  <br />
                  <span className="font-medium text-foreground mt-1 block">
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''} will be deleted.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirmedAction}>
              {confirmAction && confirmConfig[confirmAction].action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
