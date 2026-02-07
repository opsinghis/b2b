"use client";

import { useAuth } from "@b2b/auth/react";
import { Button, cn } from "@b2b/ui";
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tenants", href: "/tenants", icon: Building2 },
  { name: "Users", href: "/users", icon: Users },
  { name: "Catalog", href: "/catalog", icon: Package },
  { name: "Audit Log", href: "/audit", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Building2 className="h-6 w-6" />
          <span>B2B Admin</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        {isAuthenticated && user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </div>
              <div className="flex-1 truncate">
                <p className="font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 truncate">
              <p className="font-medium text-foreground">Not signed in</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
