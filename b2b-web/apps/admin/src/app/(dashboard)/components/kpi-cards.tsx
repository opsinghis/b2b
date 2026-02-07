"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  TrendingUp,
} from "lucide-react";

import {
  ContractKpis,
  FinancialKpis,
  formatCurrency,
  formatNumber,
  formatPercentage,
  QuoteKpis,
} from "../hooks/use-dashboard";

interface KpiCardsProps {
  contracts: ContractKpis;
  quotes: QuoteKpis;
  financial: FinancialKpis;
}

export function KpiCards({ contracts, quotes, financial }: KpiCardsProps) {
  const kpiData = [
    {
      title: "Active Contracts",
      value: formatNumber(contracts.active),
      subtitle: `${contracts.expiringThisMonth} expiring this month`,
      icon: FileCheck,
      trend: contracts.expiringThisMonth > 0 ? "warning" : "neutral",
    },
    {
      title: "Total Quotes",
      value: formatNumber(quotes.total),
      subtitle: `${formatPercentage(quotes.conversionRate)} conversion rate`,
      icon: FileText,
      trend: quotes.conversionRate > 0.5 ? "positive" : "neutral",
    },
    {
      title: "Pending Approvals",
      value: formatNumber(contracts.pendingApproval + quotes.pendingApproval),
      subtitle: `${contracts.pendingApproval} contracts, ${quotes.pendingApproval} quotes`,
      icon: Clock,
      trend:
        contracts.pendingApproval + quotes.pendingApproval > 10
          ? "warning"
          : "neutral",
    },
    {
      title: "Contract Value",
      value: formatCurrency(financial.totalContractValue, financial.currency),
      subtitle: `${formatCurrency(financial.pendingApprovalValue, financial.currency)} pending`,
      icon: DollarSign,
      trend: "positive",
    },
    {
      title: "Quote Value",
      value: formatCurrency(financial.totalQuoteValue, financial.currency),
      subtitle: `${formatNumber(quotes.approved)} approved`,
      icon: TrendingUp,
      trend: "positive",
    },
    {
      title: "Expiring Soon",
      value: formatNumber(contracts.expiringThisMonth),
      subtitle: `${formatNumber(contracts.expired)} already expired`,
      icon: AlertTriangle,
      trend: contracts.expiringThisMonth > 0 ? "warning" : "neutral",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kpiData.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon
              className={`h-4 w-4 ${
                kpi.trend === "positive"
                  ? "text-green-500"
                  : kpi.trend === "warning"
                    ? "text-amber-500"
                    : "text-muted-foreground"
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
