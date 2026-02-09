"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { format } from "date-fns";
import {
  Bell,
  FileText,
  FileCheck,
  Clock,
  Check,
  ExternalLink,
  RefreshCw,
  Mail,
  MailOpen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkNotificationUnread,
  useMarkAllNotificationsRead,
  Notification,
} from "@/app/(dashboard)/hooks/use-notifications";

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

const categoryLabels: Record<Notification["category"], string> = {
  QUOTE: "Quote",
  CONTRACT: "Contract",
  APPROVAL: "Approval",
  SYSTEM: "System",
};

function NotificationsPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-32 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onMarkUnread,
  onClick,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onClick: () => void;
}) {
  const Icon = categoryIcons[notification.category] || Bell;
  const dotColor = typeColors[notification.type] || "bg-gray-500";

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.isRead) {
      onMarkUnread();
    } else {
      onMarkRead();
    }
  };

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
        !notification.isRead
          ? "bg-muted/30 border-primary/20"
          : "bg-card border-border hover:bg-muted/20"
      }`}
    >
      <button
        onClick={onClick}
        className="flex items-start gap-4 flex-1 text-left"
      >
        <div className="relative flex-shrink-0">
          <div className="rounded-full bg-muted p-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          {!notification.isRead && (
            <span
              className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ${dotColor}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{notification.title}</p>
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
              {categoryLabels[notification.category]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {notification.message}
          </p>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground">
              {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
            {notification.linkText && notification.linkUrl && (
              <span className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                {notification.linkText}
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleToggleRead}
          title={notification.isRead ? "Mark as unread" : "Mark as read"}
        >
          {notification.isRead ? (
            <Mail className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MailOpen className="h-4 w-4 text-primary" />
          )}
        </Button>
      </div>
    </div>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const { data, isLoading, refetch } = useNotifications(50);
  const markRead = useMarkNotificationRead();
  const markUnread = useMarkNotificationUnread();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "You're all caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings/notifications">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Filter and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-foreground text-primary rounded-full">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading && !data ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "unread"
                ? "You have no unread notifications"
                : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markRead.mutate(notification.id)}
                onMarkUnread={() => markUnread.mutate(notification.id)}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth
      fallback={<NotificationsPageSkeleton />}
      redirectTo="/login"
    >
      <NotificationsContent />
    </RequireAuth>
  );
}
