"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Checkbox,
  cn,
} from "@b2b/ui";
import {
  Check,
  Loader2,
  MapPin,
  Plus,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useCallback, useState } from "react";

import { useCheckout } from "../context";
import {
  useUserAddresses,
  useCreateAddress,
  type UserAddress,
  type CreateAddressParams,
  formatAddress,
  getFullName,
} from "../hooks";

// =============================================================================
// Address Card Component
// =============================================================================

interface AddressCardProps {
  address: UserAddress;
  isSelected: boolean;
  onSelect: () => void;
}

function AddressCard({ address, isSelected, onSelect }: AddressCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {isSelected ? (
              <Check className="w-4 h-4" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {address.label || getFullName(address)}
              </span>
              {address.isDefault && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
            {address.company && (
              <p className="text-sm text-muted-foreground">
                {address.company}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {formatAddress(address)}
            </p>
            {address.phone && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {address.phone}
              </p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// New Address Form Component
// =============================================================================

interface NewAddressFormProps {
  onSubmit: (address: CreateAddressParams) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function NewAddressForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: NewAddressFormProps) {
  const [formData, setFormData] = useState<CreateAddressParams>({
    label: "",
    firstName: "",
    lastName: "",
    company: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
    isDefault: false,
    isShipping: true,
    isBilling: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const updateField = (field: keyof CreateAddressParams, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="label">Address Label (optional)</Label>
          <Input
            id="label"
            placeholder="e.g., Office, Warehouse"
            value={formData.label}
            onChange={(e) => updateField("label", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="company">Company (optional)</Label>
          <Input
            id="company"
            placeholder="Company name"
            value={formData.company}
            onChange={(e) => updateField("company", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="street1">Street Address</Label>
          <Input
            id="street1"
            placeholder="123 Main St"
            value={formData.street1}
            onChange={(e) => updateField("street1", e.target.value)}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="street2">Apartment, Suite, etc. (optional)</Label>
          <Input
            id="street2"
            placeholder="Suite 100"
            value={formData.street2}
            onChange={(e) => updateField("street2", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="City"
            value={formData.city}
            onChange={(e) => updateField("city", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="state">State / Province</Label>
          <Input
            id="state"
            placeholder="State"
            value={formData.state}
            onChange={(e) => updateField("state", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            placeholder="12345"
            value={formData.postalCode}
            onChange={(e) => updateField("postalCode", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            placeholder="US"
            value={formData.country}
            onChange={(e) => updateField("country", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="phone">Phone Number (optional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <Checkbox
            id="isDefault"
            checked={formData.isDefault}
            onCheckedChange={(checked) =>
              updateField("isDefault", checked === true)
            }
          />
          <Label htmlFor="isDefault" className="cursor-pointer">
            Set as default address
          </Label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Address
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// Main Address Step Component
// =============================================================================

export function AddressStep() {
  const { state, setShippingAddress, setBillingAddress, setUseSameAsBilling, nextStep } =
    useCheckout();
  const { data: addresses, isLoading } = useUserAddresses();
  const createAddress = useCreateAddress();

  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [showBillingAddressForm, setShowBillingAddressForm] = useState(false);

  const handleCreateAddress = useCallback(
    async (params: CreateAddressParams) => {
      try {
        const newAddress = await createAddress.mutateAsync(params);
        setShippingAddress(newAddress);
        setShowNewAddressForm(false);
      } catch {
        // Error handled by mutation
      }
    },
    [createAddress, setShippingAddress]
  );

  const handleCreateBillingAddress = useCallback(
    async (params: CreateAddressParams) => {
      try {
        const newAddress = await createAddress.mutateAsync(params);
        setBillingAddress(newAddress);
        setShowBillingAddressForm(false);
      } catch {
        // Error handled by mutation
      }
    },
    [createAddress, setBillingAddress]
  );

  const handleContinue = () => {
    if (state.shippingAddress) {
      if (state.useSameAsBilling) {
        setBillingAddress(state.shippingAddress);
      }
      nextStep();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shipping Address Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Shipping Address
          </CardTitle>
          <CardDescription>
            Select or add a shipping address for your order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNewAddressForm ? (
            <NewAddressForm
              onSubmit={handleCreateAddress}
              onCancel={() => setShowNewAddressForm(false)}
              isSubmitting={createAddress.isPending}
            />
          ) : (
            <>
              {/* Saved Addresses */}
              {addresses && addresses.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      isSelected={state.shippingAddress?.id === address.id}
                      onSelect={() => setShippingAddress(address)}
                    />
                  ))}
                </div>
              )}

              {/* Add New Address Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewAddressForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Address
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Billing Address Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Billing Address
          </CardTitle>
          <CardDescription>
            Where should we send the invoice?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="sameAsBilling"
              checked={state.useSameAsBilling}
              onCheckedChange={(checked) => setUseSameAsBilling(checked === true)}
            />
            <Label htmlFor="sameAsBilling" className="cursor-pointer">
              Same as shipping address
            </Label>
          </div>

          {!state.useSameAsBilling && (
            <>
              {showBillingAddressForm ? (
                <NewAddressForm
                  onSubmit={handleCreateBillingAddress}
                  onCancel={() => setShowBillingAddressForm(false)}
                  isSubmitting={createAddress.isPending}
                />
              ) : (
                <>
                  {addresses && addresses.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {addresses.map((address) => (
                        <AddressCard
                          key={address.id}
                          address={address}
                          isSelected={state.billingAddress?.id === address.id}
                          onSelect={() => setBillingAddress(address)}
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowBillingAddressForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Billing Address
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!state.shippingAddress}
        >
          Continue to Delivery
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
