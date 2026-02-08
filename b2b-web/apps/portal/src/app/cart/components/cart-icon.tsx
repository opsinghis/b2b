"use client";

import { Button } from "@b2b/ui";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useCart } from "../hooks";

import { CartDrawer } from "./cart-drawer";

export function CartIcon() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: cart } = useCart();

  const itemCount = cart?.itemCount ?? 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setDrawerOpen(true)}
        aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </Button>
      <CartDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
