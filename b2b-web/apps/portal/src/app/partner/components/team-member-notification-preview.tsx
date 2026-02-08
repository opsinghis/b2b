"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  cn,
} from "@b2b/ui";
import {
  Bell,
  Mail,
  Smartphone,
  CheckCircle,
} from "lucide-react";

import type { TeamMember } from "../hooks";

interface TeamMemberNotificationPreviewProps {
  teamMember: TeamMember;
  notifyEmail?: boolean;
  notifyApp?: boolean;
  onNotifyEmailChange?: (value: boolean) => void;
  onNotifyAppChange?: (value: boolean) => void;
  className?: string;
}

export function TeamMemberNotificationPreview({
  teamMember,
  notifyEmail = true,
  notifyApp = true,
  onNotifyEmailChange,
  onNotifyAppChange,
  className,
}: TeamMemberNotificationPreviewProps) {
  const fullName = `${teamMember.firstName} ${teamMember.lastName}`.trim() || teamMember.email;
  const readOnly = !onNotifyEmailChange && !onNotifyAppChange;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Team Member Notification
        </CardTitle>
        <CardDescription>
          {fullName} will be notified about this order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Notification */}
        <div className={cn(
          "flex items-start gap-3 p-3 rounded-lg",
          notifyEmail ? "bg-green-50 dark:bg-green-900/20" : "bg-muted/30"
        )}>
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            notifyEmail ? "bg-green-100 dark:bg-green-800" : "bg-muted"
          )}>
            <Mail className={cn(
              "h-5 w-5",
              notifyEmail ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notification</p>
                <p className="text-sm text-muted-foreground">
                  {teamMember.email}
                </p>
              </div>
              {readOnly ? (
                notifyEmail && (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                )
              ) : (
                <Checkbox
                  checked={notifyEmail}
                  onCheckedChange={(checked) => onNotifyEmailChange?.(checked === true)}
                />
              )}
            </div>
            {notifyEmail && (
              <p className="text-xs text-muted-foreground mt-2">
                An order confirmation email will be sent to this address
              </p>
            )}
          </div>
        </div>

        {/* App Notification */}
        <div className={cn(
          "flex items-start gap-3 p-3 rounded-lg",
          notifyApp ? "bg-blue-50 dark:bg-blue-900/20" : "bg-muted/30"
        )}>
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            notifyApp ? "bg-blue-100 dark:bg-blue-800" : "bg-muted"
          )}>
            <Smartphone className={cn(
              "h-5 w-5",
              notifyApp ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">In-App Notification</p>
                <p className="text-sm text-muted-foreground">
                  Portal notification center
                </p>
              </div>
              {readOnly ? (
                notifyApp && (
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )
              ) : (
                <Checkbox
                  checked={notifyApp}
                  onCheckedChange={(checked) => onNotifyAppChange?.(checked === true)}
                />
              )}
            </div>
            {notifyApp && (
              <p className="text-xs text-muted-foreground mt-2">
                A notification will appear in their notification center
              </p>
            )}
          </div>
        </div>

        {/* Preview Message */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
          <p className="text-sm font-medium">Preview Message:</p>
          <div className="p-3 rounded bg-background border">
            <p className="text-sm">
              <span className="font-medium">{fullName}</span>, an order has been placed on your behalf by your team partner.
              The order will be delivered to your saved address.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple notification toggle for inline use
interface NotificationToggleProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  teamMemberName: string;
  className?: string;
}

export function NotificationToggle({
  enabled,
  onEnabledChange,
  teamMemberName,
  className,
}: NotificationToggleProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg bg-muted/30",
      className
    )}>
      <Checkbox
        id="notify-toggle"
        checked={enabled}
        onCheckedChange={(checked) => onEnabledChange(checked === true)}
      />
      <Label htmlFor="notify-toggle" className="cursor-pointer flex-1">
        <span className="font-medium">Notify team member</span>
        <p className="text-sm text-muted-foreground">
          {teamMemberName} will receive an email and in-app notification about this order
        </p>
      </Label>
    </div>
  );
}
