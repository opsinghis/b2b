"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import {
  Users,
  Building2,
  FileText,
  Package,
  FileSearch,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickAction {
  title: string;
  description: string;
  icon: typeof Users;
  href: string;
  variant?: "default" | "outline";
}

const quickActions: QuickAction[] = [
  {
    title: "Manage Users",
    description: "Add, edit, or deactivate users",
    icon: Users,
    href: "/users",
  },
  {
    title: "Organizations",
    description: "View organization hierarchy",
    icon: Building2,
    href: "/organizations",
  },
  {
    title: "Master Catalog",
    description: "Manage product catalog",
    icon: Package,
    href: "/catalog",
  },
  {
    title: "Audit Log",
    description: "View system activity",
    icon: FileSearch,
    href: "/audit",
  },
  {
    title: "Tenants",
    description: "Manage tenant accounts",
    icon: FileText,
    href: "/tenants",
  },
  {
    title: "Settings",
    description: "Configure system settings",
    icon: Settings,
    href: "/settings",
    variant: "outline",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              variant={action.variant || "outline"}
              className="h-auto flex-col items-start gap-1 p-4 justify-start"
              onClick={() => router.push(action.href)}
            >
              <div className="flex items-center gap-2 w-full">
                <action.icon className="h-4 w-4" />
                <span className="font-medium">{action.title}</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal text-left">
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
