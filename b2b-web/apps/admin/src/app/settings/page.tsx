"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@b2b/ui";
import { Settings, Bell, Shield, Palette, Globe } from "lucide-react";

import { Header } from "@/components/layout";

function SettingsContent() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" />
      <div className="flex-1 p-6 space-y-6">
        <div className="max-w-4xl">
          <p className="text-muted-foreground mb-6">
            Configure your admin portal settings and preferences.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">General</CardTitle>
                </div>
                <CardDescription>
                  Basic application settings and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon - General settings will be available here.
                </p>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Notifications</CardTitle>
                </div>
                <CardDescription>
                  Configure email and in-app notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Notification preferences will be available here.
                </p>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Security</CardTitle>
                </div>
                <CardDescription>
                  Security settings and access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Security settings will be available here.
                </p>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Appearance</CardTitle>
                </div>
                <CardDescription>
                  Theme and display preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Theme customization will be available here.
                </p>
              </CardContent>
            </Card>

            {/* Localization */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Localization</CardTitle>
                </div>
                <CardDescription>
                  Language and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon - Language and timezone settings will be available here.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Settings" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access settings.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </RequireAuth>
  );
}
