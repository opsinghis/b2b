"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@b2b/ui";
import {
  MapPin,
  Check,
  Loader2,
  AlertCircle,
  Home,
} from "lucide-react";

import {
  useTeamMemberAddresses,
  type TeamMemberAddress,
} from "../hooks";

interface TeamMemberAddressSelectorProps {
  teamMemberUserId: string | null;
  selectedAddressId: string | null;
  onSelectAddress: (address: TeamMemberAddress | null) => void;
  title?: string;
  description?: string;
  className?: string;
}

export function TeamMemberAddressSelector({
  teamMemberUserId,
  selectedAddressId,
  onSelectAddress,
  title = "Delivery Address",
  description = "Select the delivery address for this order",
  className,
}: TeamMemberAddressSelectorProps) {
  const { data: addresses, isLoading, isError } = useTeamMemberAddresses(teamMemberUserId);

  if (!teamMemberUserId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Select a team member first</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading addresses...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load team member addresses</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const addressList = addresses ?? [];

  if (addressList.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <Home className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No addresses found for this team member
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The team member needs to add an address first
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {addressList.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              isSelected={selectedAddressId === address.id}
              onSelect={() => onSelectAddress(address)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface AddressCardProps {
  address: TeamMemberAddress;
  isSelected: boolean;
  onSelect: () => void;
}

function AddressCard({ address, isSelected, onSelect }: AddressCardProps) {
  const fullName = `${address.firstName} ${address.lastName}`.trim();
  const formattedAddress = formatAddress(address);

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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {address.label || fullName}
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
            <p className="text-sm text-muted-foreground">
              {formattedAddress}
            </p>
            {address.phone && (
              <p className="text-sm text-muted-foreground">
                {address.phone}
              </p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function formatAddress(address: TeamMemberAddress): string {
  const parts = [
    address.street1,
    address.street2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

export function TeamMemberAddressSelectorSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
