"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  ContractKpis,
  QuoteKpis,
  getContractStatusData,
  getQuoteStatusData,
} from "../hooks/use-dashboard";

interface DashboardChartsProps {
  contracts: ContractKpis;
  quotes: QuoteKpis;
}

export function DashboardCharts({ contracts, quotes }: DashboardChartsProps) {
  const contractStatusData = getContractStatusData(contracts);
  const quoteStatusData = getQuoteStatusData(quotes);

  // Combined bar chart data for contracts vs quotes
  const comparisonData = [
    {
      name: "Draft",
      Contracts: contracts.draft,
      Quotes: quotes.draft,
    },
    {
      name: "Pending",
      Contracts: contracts.pendingApproval,
      Quotes: quotes.pendingApproval,
    },
    {
      name: "Active/Approved",
      Contracts: contracts.active,
      Quotes: quotes.approved,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Contract Status Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contractStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
                  labelLine={false}
                >
                  {contractStatusData.map((entry, index) => (
                    <Cell key={`contract-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quote Status Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={quoteStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
                  labelLine={false}
                >
                  {quoteStatusData.map((entry, index) => (
                    <Cell key={`quote-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Bar Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Contracts vs Quotes by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="Contracts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Quotes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
