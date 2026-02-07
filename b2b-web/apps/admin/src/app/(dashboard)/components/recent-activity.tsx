"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import {
  FileText,
  FileCheck,
  User,
  Building2,
  Package,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";

import { RecentActivity as RecentActivityType, getTimeAgo } from "../hooks/use-dashboard";

interface RecentActivityProps {
  activities: RecentActivityType[];
}

const entityIcons: Record<string, typeof FileText> = {
  CONTRACT: FileCheck,
  QUOTE: FileText,
  USER: User,
  ORGANIZATION: Building2,
  PRODUCT: Package,
};

const actionIcons: Record<string, typeof PlusCircle> = {
  CREATE: PlusCircle,
  UPDATE: Edit,
  DELETE: Trash2,
  APPROVE: CheckCircle,
  REJECT: XCircle,
  SUBMIT: Send,
};

const actionColors: Record<string, string> = {
  CREATE: "text-green-500",
  UPDATE: "text-blue-500",
  DELETE: "text-red-500",
  APPROVE: "text-green-500",
  REJECT: "text-red-500",
  SUBMIT: "text-amber-500",
};

export function RecentActivityFeed({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity to display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const EntityIcon = entityIcons[activity.type] || FileText;
            const ActionIcon = actionIcons[activity.action] || Edit;
            const actionColor = actionColors[activity.action] || "text-muted-foreground";

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="rounded-full bg-muted p-2">
                      <EntityIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 rounded-full bg-background p-0.5`}
                    >
                      <ActionIcon className={`h-3 w-3 ${actionColor}`} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    <span className="text-muted-foreground">{activity.userName}</span>
                    <span className="mx-1 text-muted-foreground">
                      {activity.action.toLowerCase()}d
                    </span>
                    <span>{activity.type.toLowerCase()}</span>
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.entityName || activity.entityId}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
