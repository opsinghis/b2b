"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input } from "@b2b/ui";
import { Plus, Search, RefreshCw } from "lucide-react";
import * as React from "react";

import {
  PromotionTable,
  PromotionFilters,
  CreatePromotionModal,
  CouponManagerModal,
  Pagination,
} from "./components";
import {
  usePromotions,
  useCreatePromotion,
  useTogglePromotionStatus,
  useDeletePromotion,
  usePromotionCoupons,
  useGenerateCoupons,
  useDeactivateCoupon,
  type Promotion,
  type PromotionType,
  type PromotionStatus,
  type CreatePromotionDto,
  type GenerateCouponsDto,
} from "./hooks/use-promotions";

import { Header } from "@/components/layout";

function PromotionsContent() {
  const { hasRole } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [typeFilter, setTypeFilter] = React.useState<PromotionType | "">("");
  const [statusFilter, setStatusFilter] = React.useState<PromotionStatus | "">("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [selectedPromoForCoupons, setSelectedPromoForCoupons] = React.useState<Promotion | null>(null);
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Map active filter
  const isActive = activeFilter === "all" ? undefined : activeFilter === "active";

  const { data, isLoading, error, refetch } = usePromotions({
    search: debouncedSearch,
    page,
    limit,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    isActive,
  });

  // Coupons for selected promotion
  const { data: couponsData, isLoading: couponsLoading } = usePromotionCoupons(
    selectedPromoForCoupons?.id || "",
    { limit: 100 }
  );

  // Mutations
  const createMutation = useCreatePromotion();
  const toggleStatusMutation = useTogglePromotionStatus();
  const deleteMutation = useDeletePromotion();
  const generateCouponsMutation = useGenerateCoupons();
  const deactivateCouponMutation = useDeactivateCoupon();

  const handleCreatePromotion = async (promotionData: CreatePromotionDto) => {
    try {
      await createMutation.mutateAsync(promotionData);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    if (!confirm(`Are you sure you want to ${isActive ? "activate" : "pause"} this promotion?`)) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion? This action cannot be undone.")) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleViewCoupons = (promotion: Promotion) => {
    setSelectedPromoForCoupons(promotion);
  };

  const handleGenerateCoupons = async (data: GenerateCouponsDto) => {
    try {
      await generateCouponsMutation.mutateAsync(data);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeactivateCoupon = async (couponId: string) => {
    if (!selectedPromoForCoupons) return;
    try {
      await deactivateCouponMutation.mutateAsync({
        promotionId: selectedPromoForCoupons.id,
        couponId,
      });
    } catch {
      // Error handled by mutation
    }
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Promotions & Coupons" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access promotion management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Promotions & Coupons" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search promotions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <PromotionFilters
              type={typeFilter}
              onTypeChange={setTypeFilter}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              activeFilter={activeFilter}
              onActiveFilterChange={setActiveFilter}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Promotion
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load promotions. Please try again.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Table */}
        {data && (
          <>
            <PromotionTable
              promotions={data.data}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onViewCoupons={handleViewCoupons}
              isUpdating={toggleStatusMutation.isPending || deleteMutation.isPending}
            />
            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Create Modal */}
        <CreatePromotionModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreatePromotion}
          isLoading={createMutation.isPending}
        />

        {/* Coupon Manager Modal */}
        <CouponManagerModal
          open={!!selectedPromoForCoupons}
          onOpenChange={(open) => !open && setSelectedPromoForCoupons(null)}
          promotion={selectedPromoForCoupons}
          coupons={couponsData?.data || []}
          onGenerateCoupons={handleGenerateCoupons}
          onDeactivateCoupon={handleDeactivateCoupon}
          isLoading={couponsLoading}
          isGenerating={generateCouponsMutation.isPending}
        />
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Promotions & Coupons" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access promotion management.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <PromotionsContent />
    </RequireAuth>
  );
}
