"use client";

import { Button, Card, CardContent, CardHeader } from "@b2b/ui";
import { ExternalLink, Truck, Calendar, MapPin, Copy, Check } from "lucide-react";
import { useState } from "react";

import type { Order, OrderTracking } from "../hooks";
import { formatDate, formatAddress, getCarrierTrackingUrl } from "../hooks";

interface OrderTrackingInfoProps {
  order: Order;
  tracking?: OrderTracking | null;
}

export function OrderTrackingInfo({ order, tracking }: OrderTrackingInfoProps) {
  const [copied, setCopied] = useState(false);

  const trackingNumber = tracking?.trackingNumber || order.trackingNumber;
  const carrier = tracking?.carrier || order.carrier;
  const estimatedDelivery = tracking?.estimatedDelivery || order.estimatedDelivery;
  const trackingUrl =
    tracking?.trackingUrl ||
    order.trackingUrl ||
    (carrier && trackingNumber ? getCarrierTrackingUrl(carrier, trackingNumber) : null);

  const handleCopyTracking = async () => {
    if (trackingNumber) {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasTrackingInfo = trackingNumber || estimatedDelivery;
  const hasShippingAddress = order.shippingAddress?.street1;

  if (!hasTrackingInfo && !hasShippingAddress) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Tracking & Delivery</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tracking Number */}
        {trackingNumber && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400">
              <Truck className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Tracking Number
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm">{trackingNumber}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleCopyTracking}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              {carrier && (
                <p className="text-xs text-muted-foreground mt-1">
                  Carrier: {carrier}
                </p>
              )}
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  Track Package
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Estimated Delivery */}
        {estimatedDelivery && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Estimated Delivery
              </p>
              <p className="font-medium mt-1">{formatDate(estimatedDelivery)}</p>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {hasShippingAddress && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Delivery Address
              </p>
              <p className="text-sm mt-1">{formatAddress(order.shippingAddress)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
