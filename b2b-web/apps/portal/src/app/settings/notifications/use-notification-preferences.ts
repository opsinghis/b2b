"use client";

import * as React from "react";

// =============================================================================
// Types
// =============================================================================

export interface NotificationPreferences {
  // Email notification toggles
  email: {
    enabled: boolean;
    quotes: boolean;
    contracts: boolean;
    approvals: boolean;
    system: boolean;
  };
  // In-app notification toggles
  inApp: {
    enabled: boolean;
    quotes: boolean;
    contracts: boolean;
    approvals: boolean;
    system: boolean;
  };
  // Digest settings
  digest: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "never";
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: {
    enabled: true,
    quotes: true,
    contracts: true,
    approvals: true,
    system: true,
  },
  inApp: {
    enabled: true,
    quotes: true,
    contracts: true,
    approvals: true,
    system: true,
  },
  digest: {
    enabled: false,
    frequency: "weekly",
  },
};

const STORAGE_KEY = "b2b-notification-preferences";

// =============================================================================
// Hook
// =============================================================================

export function useNotificationPreferences() {
  const [preferences, setPreferencesState] = React.useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load preferences from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationPreferences;
        setPreferencesState({
          ...DEFAULT_PREFERENCES,
          ...parsed,
          email: { ...DEFAULT_PREFERENCES.email, ...parsed.email },
          inApp: { ...DEFAULT_PREFERENCES.inApp, ...parsed.inApp },
          digest: { ...DEFAULT_PREFERENCES.digest, ...parsed.digest },
        });
      }
    } catch (e) {
      console.error("Failed to load notification preferences:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to localStorage
  const setPreferences = React.useCallback(
    (update: NotificationPreferences | ((prev: NotificationPreferences) => NotificationPreferences)) => {
      setPreferencesState((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error("Failed to save notification preferences:", e);
        }
        return next;
      });
    },
    []
  );

  // Convenience methods for updating specific sections
  const updateEmailPreference = React.useCallback(
    (key: keyof NotificationPreferences["email"], value: boolean) => {
      setPreferences((prev) => ({
        ...prev,
        email: { ...prev.email, [key]: value },
      }));
    },
    [setPreferences]
  );

  const updateInAppPreference = React.useCallback(
    (key: keyof NotificationPreferences["inApp"], value: boolean) => {
      setPreferences((prev) => ({
        ...prev,
        inApp: { ...prev.inApp, [key]: value },
      }));
    },
    [setPreferences]
  );

  const updateDigestPreference = React.useCallback(
    <K extends keyof NotificationPreferences["digest"]>(
      key: K,
      value: NotificationPreferences["digest"][K]
    ) => {
      setPreferences((prev) => ({
        ...prev,
        digest: { ...prev.digest, [key]: value },
      }));
    },
    [setPreferences]
  );

  const resetToDefaults = React.useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, [setPreferences]);

  return {
    preferences,
    isLoaded,
    setPreferences,
    updateEmailPreference,
    updateInAppPreference,
    updateDigestPreference,
    resetToDefaults,
  };
}
