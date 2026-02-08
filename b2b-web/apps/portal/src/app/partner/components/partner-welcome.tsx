"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, cn } from "@b2b/ui";
import { Award, Building2, Percent, TrendingUp, Users, ShoppingCart } from "lucide-react";
import Link from "next/link";

import type { PartnerProfile } from "../hooks";
import { formatPercent, getTierBgColor, formatPrice } from "../hooks";

interface PartnerWelcomeProps {
  profile: PartnerProfile;
  firstName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function PartnerWelcome({ profile, firstName }: PartnerWelcomeProps) {
  const greeting = getGreeting();
  const displayName = firstName || profile.contactName.split(" ")[0] || "Partner";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Welcome to your partner dashboard. Here&apos;s an overview of your partnership.
        </p>
      </div>

      {/* Partner Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Partner Tier */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partner Tier</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  getTierBgColor(profile.tier)
                )}
              >
                {profile.tier}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {profile.companyName}
            </p>
          </CardContent>
        </Card>

        {/* Discount Level */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Discount</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPercent(profile.discountPercent)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Off all eligible products
            </p>
          </CardContent>
        </Card>

        {/* Commission Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatPercent(profile.commissionPercent)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              On team orders
            </p>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(profile.totalSales)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime sales volume
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">
                Manage your team and place orders on their behalf
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/partner#team">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Team
                </Link>
              </Button>
              <Button asChild>
                <Link href="/partner/order-on-behalf">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Order on Behalf
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PartnerWelcomeSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome Header Skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-5 w-96 bg-muted rounded animate-pulse" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
