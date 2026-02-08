"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@b2b/ui";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Truck,
  Zap,
} from "lucide-react";

import { useCheckout } from "../context";
import {
  useDeliveryMethods,
  type DeliveryMethod,
  formatPrice,
  getDeliveryEstimate,
} from "../hooks";

// =============================================================================
// Delivery Method Card Component
// =============================================================================

interface DeliveryMethodCardProps {
  method: DeliveryMethod;
  isSelected: boolean;
  onSelect: () => void;
}

function DeliveryMethodCard({
  method,
  isSelected,
  onSelect,
}: DeliveryMethodCardProps) {
  const isFree = parseFloat(method.price) === 0;
  const isExpress = method.estimatedDays <= 2;

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
              "flex items-center justify-center w-10 h-10 rounded-full",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {isSelected ? (
              <Check className="w-5 h-5" />
            ) : isExpress ? (
              <Zap className="w-5 h-5" />
            ) : (
              <Truck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{method.name}</span>
              {isExpress && (
                <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                  Express
                </span>
              )}
            </div>
            {method.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {method.description}
              </p>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Estimated delivery: {getDeliveryEstimate(method.estimatedDays)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          {isFree ? (
            <span className="font-semibold text-green-600 dark:text-green-400">
              FREE
            </span>
          ) : (
            <span className="font-semibold">{formatPrice(method.price)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// Main Delivery Step Component
// =============================================================================

export function DeliveryStep() {
  const { state, setDeliveryMethod, nextStep, prevStep } = useCheckout();
  const { data: deliveryMethods, isLoading } = useDeliveryMethods();

  const activeMethods = deliveryMethods?.filter((m) => m.isActive) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Method
          </CardTitle>
          <CardDescription>
            Choose how you would like your order delivered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No delivery methods available</p>
              <p className="text-sm">Please contact support for assistance</p>
            </div>
          ) : (
            activeMethods.map((method) => (
              <DeliveryMethodCard
                key={method.id}
                method={method}
                isSelected={state.deliveryMethod?.id === method.id}
                onSelect={() => setDeliveryMethod(method)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Selected Delivery Summary */}
      {state.deliveryMethod && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Shipping to:{" "}
                  <span className="font-medium">
                    {state.shippingAddress?.label}
                  </span>
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Delivery cost: </span>
                <span className="font-semibold">
                  {parseFloat(state.deliveryMethod.price) === 0
                    ? "FREE"
                    : formatPrice(state.deliveryMethod.price)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={prevStep}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Address
        </Button>
        <Button
          size="lg"
          onClick={nextStep}
          disabled={!state.deliveryMethod}
        >
          Continue to Payment
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
