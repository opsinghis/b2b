"use client";

import type { UpdateMasterProductDto } from "@b2b/api-client";
import { useAuth, RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import {
  ArrowLeft,
  RefreshCw,
  Archive,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import * as React from "react";

import {
  useProduct,
  useUpdateProduct,
  useUpdateProductStatus,
  useDeleteProduct,
  PRODUCT_STATUSES,
  type ProductStatus,
} from "../hooks/use-products";

import { Header } from "@/components/layout";

interface FormErrors {
  sku?: string;
  name?: string;
  listPrice?: string;
}

function EditProductContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: product, isLoading, error, refetch } = useProduct(id);
  const updateMutation = useUpdateProduct(id);
  const updateStatusMutation = useUpdateProductStatus();
  const deleteMutation = useDeleteProduct();

  const [sku, setSku] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [subcategory, setSubcategory] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [manufacturer, setManufacturer] = React.useState("");
  const [uom, setUom] = React.useState("EA");
  const [listPrice, setListPrice] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize form when product data loads
  React.useEffect(() => {
    if (product) {
      setSku(product.sku);
      setName(product.name);
      setDescription(product.description || "");
      setCategory(product.category || "");
      setSubcategory(product.subcategory || "");
      setBrand(product.brand || "");
      setManufacturer(product.manufacturer || "");
      setUom(product.uom || "EA");
      setListPrice(product.listPrice.toString());
      setCurrency(product.currency || "USD");
    }
  }, [product]);

  // Track changes
  React.useEffect(() => {
    if (!product) return;
    setHasChanges(
      sku !== product.sku ||
        name !== product.name ||
        description !== (product.description || "") ||
        category !== (product.category || "") ||
        subcategory !== (product.subcategory || "") ||
        brand !== (product.brand || "") ||
        manufacturer !== (product.manufacturer || "") ||
        uom !== (product.uom || "EA") ||
        listPrice !== product.listPrice.toString() ||
        currency !== (product.currency || "USD")
    );
  }, [
    sku,
    name,
    description,
    category,
    subcategory,
    brand,
    manufacturer,
    uom,
    listPrice,
    currency,
    product,
  ]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!sku.trim()) {
      newErrors.sku = "SKU is required";
    } else if (!/^[A-Z0-9_-]+$/i.test(sku)) {
      newErrors.sku =
        "SKU must contain only letters, numbers, hyphens, and underscores";
    }

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!listPrice.trim()) {
      newErrors.listPrice = "Price is required";
    } else if (isNaN(parseFloat(listPrice)) || parseFloat(listPrice) < 0) {
      newErrors.listPrice = "Price must be a valid positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const updateData: UpdateMasterProductDto = {
        sku: sku.toUpperCase(),
        name,
        description: description || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        brand: brand || undefined,
        manufacturer: manufacturer || undefined,
        uom: uom || "EA",
        listPrice: parseFloat(listPrice),
        currency: currency || "USD",
      };
      await updateMutation.mutateAsync(updateData);
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleUpdateStatus = async (status: ProductStatus) => {
    const statusLabel =
      status === "ACTIVE"
        ? "activate"
        : status === "DISCONTINUED"
          ? "discontinue"
          : "archive";
    if (!confirm(`Are you sure you want to ${statusLabel} this product?`)) {
      return;
    }
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/catalog");
    } catch {
      // Error handled by mutation
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit Product" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit Product" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              Product Not Found
            </h2>
            <p className="mt-2 text-muted-foreground">
              The product you are looking for does not exist or you do not have
              permission to view it.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/catalog")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Catalog
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="flex flex-col h-full">
      <Header title="Edit Product" />
      <div className="flex-1 p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/catalog")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Button>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-medium">
                Product Status
              </CardTitle>
              <CardDescription>
                {product.status === "ACTIVE"
                  ? "This product is active and available"
                  : product.status === "DISCONTINUED"
                    ? "This product has been discontinued"
                    : "This product has been archived"}
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeColor(product.status as ProductStatus)}`}
            >
              {PRODUCT_STATUSES.find((s) => s.value === product.status)?.label ||
                product.status}
            </span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              {product.status === "ACTIVE" && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus("DISCONTINUED")}
                  disabled={updateStatusMutation.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Discontinue
                </Button>
              )}
              {product.status === "DISCONTINUED" && (
                <>
                  <Button
                    variant="default"
                    onClick={() => handleUpdateStatus("ACTIVE")}
                    disabled={updateStatusMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reactivate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus("ARCHIVED")}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </>
              )}
              {product.status === "ARCHIVED" && (
                <Button
                  variant="default"
                  onClick={() => handleUpdateStatus("ACTIVE")}
                  disabled={updateStatusMutation.isPending}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Product
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>
                Update the product information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SKU and Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="PROD-001"
                    error={!!errors.sku}
                    disabled={updateMutation.isPending}
                  />
                  {errors.sku && (
                    <p className="text-sm text-destructive">{errors.sku}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product name"
                    error={!!errors.name}
                    disabled={updateMutation.isPending}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={updateMutation.isPending}
                />
              </div>

              {/* Category and Subcategory */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Software"
                    disabled={updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="Licenses"
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>

              {/* Brand and Manufacturer */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Acme Corp"
                    disabled={updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="Acme Industries"
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>

              {/* Price, Currency, and UOM */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="listPrice">List Price *</Label>
                  <Input
                    id="listPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="999.99"
                    error={!!errors.listPrice}
                    disabled={updateMutation.isPending}
                  />
                  {errors.listPrice && (
                    <p className="text-sm text-destructive">
                      {errors.listPrice}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={currency}
                    onValueChange={setCurrency}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uom">Unit of Measure</Label>
                  <Select
                    value={uom}
                    onValueChange={setUom}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger id="uom">
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">Each (EA)</SelectItem>
                      <SelectItem value="PK">Pack (PK)</SelectItem>
                      <SelectItem value="CS">Case (CS)</SelectItem>
                      <SelectItem value="BX">Box (BX)</SelectItem>
                      <SelectItem value="HR">Hour (HR)</SelectItem>
                      <SelectItem value="MO">Month (MO)</SelectItem>
                      <SelectItem value="YR">Year (YR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">
                    {product.id}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(product.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{" "}
                  {new Date(product.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={updateMutation.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !hasChanges}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Mutation Error */}
        {updateMutation.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to update product. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  useAuth();

  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Edit Product" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">
                Access Denied
              </h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to edit products. This feature is
                only available to Admins.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <EditProductContent />
    </RequireAuth>
  );
}
