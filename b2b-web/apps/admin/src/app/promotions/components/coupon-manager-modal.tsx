"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Switch,
  DatePicker,
} from "@b2b/ui";
import { Copy, Download, RefreshCw, XCircle } from "lucide-react";
import * as React from "react";

import type { Promotion, CouponCode, GenerateCouponsDto } from "../hooks/use-promotions";

interface CouponManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: Promotion | null;
  coupons: CouponCode[];
  onGenerateCoupons: (data: GenerateCouponsDto) => void;
  onDeactivateCoupon: (couponId: string) => void;
  isLoading?: boolean;
  isGenerating?: boolean;
}

export function CouponManagerModal({
  open,
  onOpenChange,
  promotion,
  coupons,
  onGenerateCoupons,
  onDeactivateCoupon,
  isLoading,
  isGenerating,
}: CouponManagerModalProps) {
  const [count, setCount] = React.useState("10");
  const [prefix, setPrefix] = React.useState("");
  const [usageLimit, setUsageLimit] = React.useState("");
  const [hasExpiry, setHasExpiry] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>();

  const handleGenerate = () => {
    if (!promotion) return;

    const data: GenerateCouponsDto = {
      promotionId: promotion.id,
      count: parseInt(count, 10),
      prefix: prefix || undefined,
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
      expiresAt: hasExpiry && expiresAt ? expiresAt.toISOString() : undefined,
    };

    onGenerateCoupons(data);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const copyAllCodes = () => {
    const codes = coupons.map((c) => c.code).join("\n");
    navigator.clipboard.writeText(codes);
  };

  const exportCsv = () => {
    const headers = ["Code", "Usage Limit", "Usage Count", "Expires At", "Status", "Created At"];
    const rows = coupons.map((c) => [
      c.code,
      c.usageLimit?.toString() || "Unlimited",
      c.usageCount.toString(),
      c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never",
      c.isActive ? "Active" : "Inactive",
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupons-${promotion?.code || promotion?.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!promotion) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Manage Coupons: {promotion.name}</ModalTitle>
          <ModalDescription>
            Generate and manage coupon codes for this promotion.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-6 py-4">
          {/* Generate Section */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Generate New Coupons</h3>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-count">Quantity</Label>
                <Input
                  id="coupon-count"
                  type="number"
                  min="1"
                  max="1000"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-prefix">Prefix (Optional)</Label>
                <Input
                  id="coupon-prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g., SALE"
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-limit">Usage Limit Each</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Expires</Label>
                  <Switch
                    checked={hasExpiry}
                    onCheckedChange={setHasExpiry}
                    disabled={isGenerating}
                  />
                </div>
                {hasExpiry ? (
                  <DatePicker
                    value={expiresAt}
                    onChange={setExpiresAt}
                    disabled={isGenerating}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground pt-2">No expiry</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating || !count}>
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Coupons"
                )}
              </Button>
            </div>
          </div>

          {/* Existing Coupons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Existing Coupons ({coupons.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyAllCodes} disabled={coupons.length === 0}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All
                </Button>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={coupons.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No coupons generated yet. Generate coupons above.
                </p>
              </div>
            ) : (
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                              {coupon.code}
                            </code>
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Copy code"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {coupon.usageCount}
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                        </TableCell>
                        <TableCell>{formatDate(coupon.expiresAt)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              coupon.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {coupon.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {coupon.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeactivateCoupon(coupon.id)}
                              title="Deactivate coupon"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
