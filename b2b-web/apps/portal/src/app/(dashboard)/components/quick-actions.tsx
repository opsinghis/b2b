"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import { FilePlus, FileText, FileCheck, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickAction {
  title: string;
  description: string;
  icon: typeof FilePlus;
  href: string;
  variant?: "default" | "outline";
}

const quickActions: QuickAction[] = [
  {
    title: "New Quote",
    description: "Create a new quote request",
    icon: FilePlus,
    href: "/quotes/new",
    variant: "default",
  },
  {
    title: "View Contracts",
    description: "Browse your active contracts",
    icon: FileCheck,
    href: "/contracts",
  },
  {
    title: "My Quotes",
    description: "View all your quotes",
    icon: FileText,
    href: "/quotes",
  },
  {
    title: "Browse Catalog",
    description: "Explore available products",
    icon: ShoppingCart,
    href: "/catalog",
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
