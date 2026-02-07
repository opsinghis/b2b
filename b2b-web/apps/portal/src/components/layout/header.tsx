"use client";

import { Button } from "@b2b/ui";
import { Bell, User } from "lucide-react";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Portal" }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-primary">B2B Portal</span>
        {title && (
          <>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-lg font-medium">{title}</h1>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
          <span className="sr-only">Account</span>
        </Button>
      </div>
    </header>
  );
}
