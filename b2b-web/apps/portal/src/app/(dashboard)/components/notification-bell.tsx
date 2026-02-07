"use client";

import { Button, Popover, PopoverContent, PopoverTrigger } from "@b2b/ui";
import { Bell, FileText, FileCheck, Clock, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

import { getTimeAgo } from "../hooks/use-dashboard";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  Notification,
} from "../hooks/use-notifications";

const categoryIcons: Record<Notification["category"], typeof Bell> = {
  QUOTE: FileText,
  CONTRACT: FileCheck,
  APPROVAL: Clock,
  SYSTEM: Bell,
};

const typeColors: Record<Notification["type"], string> = {
  SUCCESS: "bg-green-500",
  WARNING: "bg-amber-500",
  ERROR: "bg-red-500",
  INFO: "bg-blue-500",
};

export function NotificationBell() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.items ?? [];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = categoryIcons[notification.category] || Bell;
                const dotColor = typeColors[notification.type] || "bg-gray-500";

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${
                      !notification.isRead ? "bg-muted/30" : ""
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="rounded-full bg-muted p-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {!notification.isRead && (
                        <span
                          className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${dotColor}`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                        {notification.linkText && (
                          <span className="text-xs text-primary flex items-center gap-0.5">
                            {notification.linkText}
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => router.push("/notifications")}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
