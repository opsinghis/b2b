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
} from "@b2b/ui";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { useState, useCallback } from "react";

import {
  useCatalogProducts,
  formatPrice,
  type CatalogProduct,
} from "../../catalog/hooks/use-catalog";
import { useQuoteBuilder, type QuoteLineItemDraft } from "../context/quote-builder-context";

export function ProductsStep() {
  const {
    state,
    addProduct,
    updateLineItem,
    removeLineItem,
    prevStep,
    nextStep,
    canProceed,
    subtotal,
    discountAmount,
    total,
  } = useQuoteBuilder();

  const [searchQuery, setSearchQuery] = useState("");

  // Fetch products based on search
  const { data: productsData, isLoading: productsLoading } = useCatalogProducts({
    search: searchQuery,
    limit: 8,
    accessOnly: true,
  });

  const products = productsData?.data ?? [];

  const handleAddProduct = useCallback(
    (product: CatalogProduct) => {
      addProduct(product);
      setSearchQuery("");
    },
    [addProduct]
  );

  const handleContinue = () => {
    if (canProceed()) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Step 2: Add Products
          </CardTitle>
          <CardDescription>
            Search and add products to your quote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={state.isProcessing}
            />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {productsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Searching...
                </div>
              ) : products.length > 0 ? (
                products.map((product) => (
                  <ProductSearchResult
                    key={product.id}
                    product={product}
                    onAdd={handleAddProduct}
                    isInQuote={state.lineItems.some(
                      (item) => item.product.id === product.id
                    )}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No products found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Line Items ({state.lineItems.length})</CardTitle>
          <CardDescription>
            Edit quantities and prices for each product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.lineItems.length > 0 ? (
            <div className="space-y-4">
              {/* Line Items List */}
              <div className="border rounded-lg divide-y">
                {state.lineItems.map((item) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => updateLineItem(item.id, updates)}
                    onRemove={() => removeLineItem(item.id)}
                    disabled={state.isProcessing}
                  />
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({state.discountPercent}%)</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No products added yet</p>
              <p className="text-xs mt-1">
                Search for products above to add them to your quote
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={state.isProcessing}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Details
        </Button>
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!canProceed() || state.isProcessing}
        >
          Continue to Review
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Product Search Result Component
// =============================================================================

interface ProductSearchResultProps {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct) => void;
  isInQuote: boolean;
}

function ProductSearchResult({
  product,
  onAdd,
  isInQuote,
}: ProductSearchResultProps) {
  return (
    <div className="p-3 flex items-center justify-between hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{product.name}</div>
        <div className="text-xs text-muted-foreground">
          SKU: {product.sku} | {formatPrice(product.effectivePrice, product.currency)}
        </div>
      </div>
      <Button
        variant={isInQuote ? "outline" : "ghost"}
        size="sm"
        onClick={() => onAdd(product)}
        disabled={!product.hasAccess}
      >
        <Plus className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">
          {isInQuote ? "Add More" : "Add"}
        </span>
      </Button>
    </div>
  );
}

// =============================================================================
// Line Item Row Component
// =============================================================================

interface LineItemRowProps {
  item: QuoteLineItemDraft;
  onUpdate: (updates: Partial<QuoteLineItemDraft>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function LineItemRow({ item, onUpdate, onRemove, disabled }: LineItemRowProps) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState(item.unitPrice.toString());

  const lineTotal = item.unitPrice * item.quantity;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    onUpdate({ quantity: newQuantity });
  };

  const handleQuantityInput = (value: string) => {
    const qty = parseInt(value, 10);
    if (!isNaN(qty) && qty >= 1) {
      onUpdate({ quantity: qty });
    }
  };

  const handlePriceEdit = () => {
    setEditPrice(item.unitPrice.toString());
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    const price = parseFloat(editPrice);
    if (!isNaN(price) && price >= 0) {
      onUpdate({
        unitPrice: price,
        priceOverride: price !== item.originalPrice,
      });
    }
    setIsEditingPrice(false);
  };

  const handlePriceCancel = () => {
    setEditPrice(item.unitPrice.toString());
    setIsEditingPrice(false);
  };

  const handlePriceReset = () => {
    onUpdate({
      unitPrice: item.originalPrice,
      priceOverride: false,
    });
  };

  return (
    <div className="p-4 space-y-3">
      {/* Product Info Row */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.product.name}</div>
          <div className="text-xs text-muted-foreground">
            SKU: {item.product.sku}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Quantity and Price Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Qty:</Label>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(-1)}
            disabled={disabled || item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => handleQuantityInput(e.target.value)}
            className="w-16 h-8 text-center"
            disabled={disabled}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(1)}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Unit Price */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Unit Price:</Label>
          {isEditingPrice ? (
            <div className="flex items-center gap-1">
              <span className="text-sm">$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-24 h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePriceSave();
                  if (e.key === "Escape") handlePriceCancel();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600"
                onClick={handlePriceSave}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={handlePriceCancel}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  item.priceOverride ? "text-blue-600" : ""
                }`}
              >
                {formatPrice(item.unitPrice)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handlePriceEdit}
                disabled={disabled}
                title="Edit price"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              {item.priceOverride && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={handlePriceReset}
                  disabled={disabled}
                  title="Reset to original price"
                >
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Line Total */}
        <div className="flex items-center gap-2 ml-auto">
          <Label className="text-xs text-muted-foreground">Total:</Label>
          <span className="font-semibold">{formatPrice(lineTotal)}</span>
        </div>
      </div>

      {/* Notes Input */}
      <div className="space-y-1">
        <Input
          placeholder="Add notes for this line item..."
          value={item.notes || ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          disabled={disabled}
          className="text-sm"
        />
      </div>
    </div>
  );
}
