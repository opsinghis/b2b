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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { Plus, Trash2 } from "lucide-react";
import * as React from "react";

import type { CreateManualOrderDto, OrderAddress } from "../hooks/use-orders";

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateManualOrderDto) => void;
  users: { id: string; name: string; email: string }[];
  organizations: { id: string; name: string }[];
  isLoading?: boolean;
}

interface OrderItemInput {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
}

interface FormErrors {
  userId?: string;
  items?: string;
  shippingAddress?: {
    street1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

const emptyAddress: OrderAddress = {
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

const emptyItem: OrderItemInput = {
  productId: "",
  productName: "",
  productSku: "",
  quantity: 1,
  unitPrice: 0,
};

export function CreateOrderModal({
  open,
  onOpenChange,
  onSubmit,
  users,
  organizations,
  isLoading,
}: CreateOrderModalProps) {
  const [userId, setUserId] = React.useState("");
  const [organizationId, setOrganizationId] = React.useState("");
  const [items, setItems] = React.useState<OrderItemInput[]>([{ ...emptyItem }]);
  const [shippingAddress, setShippingAddress] = React.useState<OrderAddress>({ ...emptyAddress });
  const [useBillingAddress, setUseBillingAddress] = React.useState(false);
  const [billingAddress, setBillingAddress] = React.useState<OrderAddress>({ ...emptyAddress });
  const [notes, setNotes] = React.useState("");
  const [couponCode, setCouponCode] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const resetForm = () => {
    setUserId("");
    setOrganizationId("");
    setItems([{ ...emptyItem }]);
    setShippingAddress({ ...emptyAddress });
    setUseBillingAddress(false);
    setBillingAddress({ ...emptyAddress });
    setNotes("");
    setCouponCode("");
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!userId) {
      newErrors.userId = "Customer is required";
    }

    if (items.length === 0 || items.every((i) => !i.productName || i.quantity <= 0)) {
      newErrors.items = "At least one item is required";
    }

    if (!shippingAddress.street1) {
      newErrors.shippingAddress = {
        ...newErrors.shippingAddress,
        street1: "Street is required",
      };
    }
    if (!shippingAddress.city) {
      newErrors.shippingAddress = {
        ...newErrors.shippingAddress,
        city: "City is required",
      };
    }
    if (!shippingAddress.postalCode) {
      newErrors.shippingAddress = {
        ...newErrors.shippingAddress,
        postalCode: "Postal code is required",
      };
    }
    if (!shippingAddress.country) {
      newErrors.shippingAddress = {
        ...newErrors.shippingAddress,
        country: "Country is required",
      };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const validItems = items.filter((i) => i.productName && i.quantity > 0);

    onSubmit({
      userId,
      organizationId: organizationId || undefined,
      items: validItems.map((i) => ({
        productId: i.productId || crypto.randomUUID(),
        productName: i.productName,
        productSku: i.productSku || undefined,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      shippingAddress,
      billingAddress: useBillingAddress ? billingAddress : undefined,
      notes: notes || undefined,
      couponCode: couponCode || undefined,
    });
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Create Manual Order</ModalTitle>
            <ModalDescription>
              Create a new order on behalf of a customer.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6 py-4">
            {/* Customer Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Customer *</Label>
                  <Select value={userId} onValueChange={setUserId} disabled={isLoading}>
                    <SelectTrigger id="userId" className={errors.userId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.userId && (
                    <p className="text-sm text-destructive">{errors.userId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Organization (optional)</Label>
                  <Select
                    value={organizationId || "__none__"}
                    onValueChange={(value) => setOrganizationId(value === "__none__" ? "" : value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="organizationId">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold">Order Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              {errors.items && (
                <p className="text-sm text-destructive">{errors.items}</p>
              )}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Product Name *</Label>
                      <Input
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, "productName", e.target.value)}
                        placeholder="Product name"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={item.productSku}
                        onChange={(e) => handleItemChange(index, "productSku", e.target.value)}
                        placeholder="SKU"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Unit Price *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1 || isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right font-semibold">
                Subtotal: ${calculateTotal().toFixed(2)}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Shipping Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping-street1">Street Address *</Label>
                  <Input
                    id="shipping-street1"
                    value={shippingAddress.street1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street1: e.target.value })}
                    error={!!errors.shippingAddress?.street1}
                    disabled={isLoading}
                  />
                  {errors.shippingAddress?.street1 && (
                    <p className="text-sm text-destructive">{errors.shippingAddress.street1}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-street2">Apt/Suite (optional)</Label>
                  <Input
                    id="shipping-street2"
                    value={shippingAddress.street2 || ""}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street2: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping-city">City *</Label>
                  <Input
                    id="shipping-city"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    error={!!errors.shippingAddress?.city}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-state">State</Label>
                  <Input
                    id="shipping-state"
                    value={shippingAddress.state || ""}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-postal">Postal Code *</Label>
                  <Input
                    id="shipping-postal"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    error={!!errors.shippingAddress?.postalCode}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-country">Country *</Label>
                  <Input
                    id="shipping-country"
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    error={!!errors.shippingAddress?.country}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Billing Address (optional) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-billing"
                  checked={useBillingAddress}
                  onChange={(e) => setUseBillingAddress(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="use-billing" className="font-normal">
                  Use different billing address
                </Label>
              </div>
              {useBillingAddress && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing-street1">Street Address</Label>
                      <Input
                        id="billing-street1"
                        value={billingAddress.street1}
                        onChange={(e) => setBillingAddress({ ...billingAddress, street1: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-street2">Apt/Suite</Label>
                      <Input
                        id="billing-street2"
                        value={billingAddress.street2 || ""}
                        onChange={(e) => setBillingAddress({ ...billingAddress, street2: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing-city">City</Label>
                      <Input
                        id="billing-city"
                        value={billingAddress.city}
                        onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-state">State</Label>
                      <Input
                        id="billing-state"
                        value={billingAddress.state || ""}
                        onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-postal">Postal Code</Label>
                      <Input
                        id="billing-postal"
                        value={billingAddress.postalCode}
                        onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-country">Country</Label>
                      <Input
                        id="billing-country"
                        value={billingAddress.country}
                        onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Additional Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon">Coupon Code (optional)</Label>
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (optional)</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes"
                    disabled={isLoading}
                  />
                </div>
              </div>
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
              {isLoading ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
