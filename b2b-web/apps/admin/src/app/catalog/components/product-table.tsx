"use client";

import type { MasterProductResponseDto } from "@b2b/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@b2b/ui";
import { Edit, Archive, Trash2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { PRODUCT_STATUSES, type ProductStatus } from "../hooks/use-products";

interface ProductTableProps {
  products: MasterProductResponseDto[];
  onUpdateStatus: (id: string, status: ProductStatus) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
}

export function ProductTable({
  products,
  onUpdateStatus,
  onDelete,
  isUpdating,
}: ProductTableProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPrice = (price: string | number, currency: string) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(numPrice);
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = PRODUCT_STATUSES.find((s) => s.value === status);
    return statusConfig?.label || status;
  };

  const getStatusBadgeColor = (status: ProductStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "DISCONTINUED":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No products found.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {product.sku}
                  </code>
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {product.name}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{product.category || "-"}</span>
                    {product.subcategory && (
                      <span className="text-xs text-muted-foreground">
                        {product.subcategory}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{product.brand || "-"}</TableCell>
                <TableCell>
                  {formatPrice(product.listPrice, product.currency)}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(product.status as ProductStatus)}`}
                  >
                    {getStatusLabel(product.status)}
                  </span>
                </TableCell>
                <TableCell>{formatDate(product.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/catalog/${product.id}`)}
                      title="Edit product"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {product.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          onUpdateStatus(product.id, "DISCONTINUED")
                        }
                        disabled={isUpdating}
                        title="Discontinue product"
                      >
                        <Archive className="h-4 w-4 text-orange-500" />
                      </Button>
                    )}
                    {product.status === "DISCONTINUED" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onUpdateStatus(product.id, "ACTIVE")}
                          disabled={isUpdating}
                          title="Reactivate product"
                        >
                          <RotateCcw className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onUpdateStatus(product.id, "ARCHIVED")}
                          disabled={isUpdating}
                          title="Archive product"
                        >
                          <Archive className="h-4 w-4 text-gray-500" />
                        </Button>
                      </>
                    )}
                    {product.status === "ARCHIVED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onUpdateStatus(product.id, "ACTIVE")}
                        disabled={isUpdating}
                        title="Restore product"
                      >
                        <RotateCcw className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(product.id)}
                      disabled={isUpdating}
                      title="Delete product"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
