"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import { FileText, FileCheck, Clock } from "lucide-react";

import { UserKpis, formatNumber } from "../hooks/use-dashboard";

interface KpiCardsProps {
  kpis: UserKpis;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const kpiData = [
    {
      title: "My Quotes",
      value: formatNumber(kpis.myQuotes.total),
      subtitle: `${kpis.myQuotes.draft} draft, ${kpis.myQuotes.pendingApproval} pending`,
      icon: FileText,
      highlight: kpis.myQuotes.pendingApproval > 0,
    },
    {
      title: "My Contracts",
      value: formatNumber(kpis.myContracts.total),
      subtitle: `${kpis.myContracts.active} active, ${kpis.myContracts.expiringThisMonth} expiring soon`,
      icon: FileCheck,
      highlight: kpis.myContracts.expiringThisMonth > 0,
    },
    {
      title: "Pending Approvals",
      value: formatNumber(kpis.pendingApprovals.total),
      subtitle: `${kpis.pendingApprovals.quotes} quotes, ${kpis.pendingApprovals.contracts} contracts`,
      icon: Clock,
      highlight: kpis.pendingApprovals.total > 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {kpiData.map((kpi) => (
        <Card key={kpi.title} className={kpi.highlight ? "border-amber-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon
              className={`h-4 w-4 ${
                kpi.highlight ? "text-amber-500" : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
