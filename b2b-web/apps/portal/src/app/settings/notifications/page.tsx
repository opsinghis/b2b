"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@b2b/ui";
import {
  Bell,
  Mail,
  FileText,
  FileCheck,
  Clock,
  Settings,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

import { useNotificationPreferences } from "./use-notification-preferences";

import { Header } from "@/components/layout";

function NotificationPreferencesSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Notification Preferences" />
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface PreferenceRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function PreferenceRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

function NotificationPreferencesContent() {
  const {
    preferences,
    isLoaded,
    updateEmailPreference,
    updateInAppPreference,
    updateDigestPreference,
    resetToDefaults,
  } = useNotificationPreferences();

  if (!isLoaded) {
    return <NotificationPreferencesSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Notification Preferences" />
      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/notifications">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Notification Preferences
              </h2>
              <p className="text-muted-foreground">
                Manage how and when you receive notifications
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to defaults
          </Button>
        </div>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Receive notifications via email for important updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <PreferenceRow
              icon={<Mail className="h-4 w-4" />}
              label="Enable email notifications"
              description="Receive notifications via email"
              checked={preferences.email.enabled}
              onCheckedChange={(checked) =>
                updateEmailPreference("enabled", checked)
              }
            />
            <PreferenceRow
              icon={<FileText className="h-4 w-4" />}
              label="Quote updates"
              description="Get notified when quotes are created, updated, or require action"
              checked={preferences.email.quotes}
              onCheckedChange={(checked) =>
                updateEmailPreference("quotes", checked)
              }
              disabled={!preferences.email.enabled}
            />
            <PreferenceRow
              icon={<FileCheck className="h-4 w-4" />}
              label="Contract updates"
              description="Get notified about contract status changes and renewals"
              checked={preferences.email.contracts}
              onCheckedChange={(checked) =>
                updateEmailPreference("contracts", checked)
              }
              disabled={!preferences.email.enabled}
            />
            <PreferenceRow
              icon={<Clock className="h-4 w-4" />}
              label="Approval requests"
              description="Get notified when items need your approval"
              checked={preferences.email.approvals}
              onCheckedChange={(checked) =>
                updateEmailPreference("approvals", checked)
              }
              disabled={!preferences.email.enabled}
            />
            <PreferenceRow
              icon={<Settings className="h-4 w-4" />}
              label="System notifications"
              description="Important system updates and announcements"
              checked={preferences.email.system}
              onCheckedChange={(checked) =>
                updateEmailPreference("system", checked)
              }
              disabled={!preferences.email.enabled}
            />
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              In-App Notifications
            </CardTitle>
            <CardDescription>
              Control which notifications appear in the notification bell
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <PreferenceRow
              icon={<Bell className="h-4 w-4" />}
              label="Enable in-app notifications"
              description="Show notifications in the app"
              checked={preferences.inApp.enabled}
              onCheckedChange={(checked) =>
                updateInAppPreference("enabled", checked)
              }
            />
            <PreferenceRow
              icon={<FileText className="h-4 w-4" />}
              label="Quote updates"
              description="Show quote-related notifications"
              checked={preferences.inApp.quotes}
              onCheckedChange={(checked) =>
                updateInAppPreference("quotes", checked)
              }
              disabled={!preferences.inApp.enabled}
            />
            <PreferenceRow
              icon={<FileCheck className="h-4 w-4" />}
              label="Contract updates"
              description="Show contract-related notifications"
              checked={preferences.inApp.contracts}
              onCheckedChange={(checked) =>
                updateInAppPreference("contracts", checked)
              }
              disabled={!preferences.inApp.enabled}
            />
            <PreferenceRow
              icon={<Clock className="h-4 w-4" />}
              label="Approval requests"
              description="Show approval-related notifications"
              checked={preferences.inApp.approvals}
              onCheckedChange={(checked) =>
                updateInAppPreference("approvals", checked)
              }
              disabled={!preferences.inApp.enabled}
            />
            <PreferenceRow
              icon={<Settings className="h-4 w-4" />}
              label="System notifications"
              description="Show system-related notifications"
              checked={preferences.inApp.system}
              onCheckedChange={(checked) =>
                updateInAppPreference("system", checked)
              }
              disabled={!preferences.inApp.enabled}
            />
          </CardContent>
        </Card>

        {/* Email Digest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Digest
            </CardTitle>
            <CardDescription>
              Receive a summary of your notifications instead of individual
              emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PreferenceRow
              icon={<Mail className="h-4 w-4" />}
              label="Enable email digest"
              description="Receive a periodic summary instead of individual notifications"
              checked={preferences.digest.enabled}
              onCheckedChange={(checked) =>
                updateDigestPreference("enabled", checked)
              }
            />
            {preferences.digest.enabled && (
              <div className="flex items-center justify-between py-3 pl-7">
                <div>
                  <Label className="text-sm font-medium">Digest frequency</Label>
                  <p className="text-xs text-muted-foreground">
                    How often to receive the digest email
                  </p>
                </div>
                <Select
                  value={preferences.digest.frequency}
                  onValueChange={(value: "daily" | "weekly" | "never") =>
                    updateDigestPreference("frequency", value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note about preferences */}
        <p className="text-sm text-muted-foreground text-center">
          Your preferences are saved automatically and will be applied
          immediately.
        </p>
      </div>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  return (
    <RequireAuth
      fallback={<NotificationPreferencesSkeleton />}
      redirectTo="/login"
    >
      <NotificationPreferencesContent />
    </RequireAuth>
  );
}
