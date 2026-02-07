"use client";

import type { CreateMasterProductDto } from "@b2b/api-client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import * as React from "react";

import { PRODUCT_STATUSES, type ProductStatus } from "../hooks/use-products";

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMasterProductDto) => void;
  isLoading?: boolean;
}

interface FormErrors {
  sku?: string;
  name?: string;
  listPrice?: string;
}

export function CreateProductModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateProductModalProps) {
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
  const [status, setStatus] = React.useState<ProductStatus>("ACTIVE");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const resetForm = () => {
    setSku("");
    setName("");
    setDescription("");
    setCategory("");
    setSubcategory("");
    setBrand("");
    setManufacturer("");
    setUom("EA");
    setListPrice("");
    setCurrency("USD");
    setStatus("ACTIVE");
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!sku.trim()) {
      newErrors.sku = "SKU is required";
    } else if (!/^[A-Z0-9_-]+$/i.test(sku)) {
      newErrors.sku = "SKU must contain only letters, numbers, hyphens, and underscores";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    onSubmit({
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
      status,
    });
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Create New Product</ModalTitle>
            <ModalDescription>
              Add a new product to the master catalog.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4 py-4">
            {/* SKU and Name */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-sku">SKU *</Label>
                <Input
                  id="modal-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="PROD-001"
                  error={!!errors.sku}
                  disabled={isLoading}
                />
                {errors.sku && (
                  <p className="text-sm text-destructive">{errors.sku}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-name">Name *</Label>
                <Input
                  id="modal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product name"
                  error={!!errors.name}
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="modal-description">Description</Label>
              <textarea
                id="modal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
            </div>

            {/* Category and Subcategory */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-category">Category</Label>
                <Input
                  id="modal-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Software"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-subcategory">Subcategory</Label>
                <Input
                  id="modal-subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Licenses"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Brand and Manufacturer */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-brand">Brand</Label>
                <Input
                  id="modal-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Acme Corp"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-manufacturer">Manufacturer</Label>
                <Input
                  id="modal-manufacturer"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Acme Industries"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Price, Currency, and UOM */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="modal-listPrice">List Price *</Label>
                <Input
                  id="modal-listPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="999.99"
                  error={!!errors.listPrice}
                  disabled={isLoading}
                />
                {errors.listPrice && (
                  <p className="text-sm text-destructive">{errors.listPrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-currency">Currency</Label>
                <Select
                  value={currency}
                  onValueChange={setCurrency}
                  disabled={isLoading}
                >
                  <SelectTrigger id="modal-currency">
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
                <Label htmlFor="modal-uom">Unit of Measure</Label>
                <Select value={uom} onValueChange={setUom} disabled={isLoading}>
                  <SelectTrigger id="modal-uom">
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="modal-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ProductStatus)}
                disabled={isLoading}
              >
                <SelectTrigger id="modal-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
