import { Building2, FileText, Package, Users } from "lucide-react";

import { Header } from "@/components/layout";

const stats = [
  { name: "Total Tenants", value: "—", icon: Building2 },
  { name: "Active Users", value: "—", icon: Users },
  { name: "Catalog Items", value: "—", icon: Package },
  { name: "Audit Events", value: "—", icon: FileText },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <p className="text-muted-foreground">
            Welcome to the B2B Admin Portal. Use the sidebar to navigate to
            different sections.
          </p>
        </div>
      </div>
    </div>
  );
}
