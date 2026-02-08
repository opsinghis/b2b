"use client";

import { useAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

import { NotificationBell } from "@/app/(dashboard)/components/notification-bell";
import { CartIcon } from "@/app/cart/components";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Portal" }: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">
          B2B Portal
        </Link>
        {title && title !== "Portal" && (
          <>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-lg font-medium">{title}</h1>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isAuthenticated && <CartIcon />}
        {isAuthenticated && <NotificationBell />}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </div>
              <span className="text-sm font-medium hidden sm:inline">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
            <span className="sr-only">Account</span>
          </Button>
        )}
      </div>
    </header>
  );
}
