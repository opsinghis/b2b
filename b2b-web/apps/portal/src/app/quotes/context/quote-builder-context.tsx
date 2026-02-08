"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";

import type { CatalogProduct } from "../../catalog/hooks/use-catalog";

// =============================================================================
// Types
// =============================================================================

export type QuoteBuilderStep =
  | "details"
  | "products"
  | "review"
  | "confirmation";

export interface QuoteLineItemDraft {
  id: string;
  product: CatalogProduct;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  priceOverride: boolean;
  notes?: string;
}

export interface QuoteBuilderState {
  currentStep: QuoteBuilderStep;
  // Quote Details
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  validUntil: string;
  notes: string;
  internalNotes: string;
  discountPercent: number;
  // Line Items
  lineItems: QuoteLineItemDraft[];
  // Result
  savedQuoteId: string | null;
  quoteNumber: string | null;
  // UI State
  isProcessing: boolean;
  error: string | null;
}

type QuoteBuilderAction =
  | { type: "SET_STEP"; step: QuoteBuilderStep }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_DESCRIPTION"; description: string }
  | { type: "SET_CUSTOMER_NAME"; customerName: string }
  | { type: "SET_CUSTOMER_EMAIL"; customerEmail: string }
  | { type: "SET_VALID_UNTIL"; validUntil: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_INTERNAL_NOTES"; internalNotes: string }
  | { type: "SET_DISCOUNT_PERCENT"; discountPercent: number }
  | { type: "ADD_LINE_ITEM"; item: QuoteLineItemDraft }
  | { type: "UPDATE_LINE_ITEM"; id: string; updates: Partial<QuoteLineItemDraft> }
  | { type: "REMOVE_LINE_ITEM"; id: string }
  | { type: "CLEAR_LINE_ITEMS" }
  | { type: "SET_SAVED_QUOTE"; quoteId: string; quoteNumber: string }
  | { type: "SET_PROCESSING"; isProcessing: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

interface QuoteBuilderContextValue {
  state: QuoteBuilderState;
  dispatch: React.Dispatch<QuoteBuilderAction>;
  // Convenience methods
  goToStep: (step: QuoteBuilderStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setCustomerName: (name: string) => void;
  setCustomerEmail: (email: string) => void;
  setValidUntil: (date: string) => void;
  setNotes: (notes: string) => void;
  setInternalNotes: (notes: string) => void;
  setDiscountPercent: (percent: number) => void;
  addProduct: (product: CatalogProduct) => void;
  updateLineItem: (id: string, updates: Partial<QuoteLineItemDraft>) => void;
  removeLineItem: (id: string) => void;
  clearLineItems: () => void;
  setSavedQuote: (quoteId: string, quoteNumber: string) => void;
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  canProceed: () => boolean;
  // Computed values
  subtotal: number;
  discountAmount: number;
  total: number;
}

// =============================================================================
// Initial State & Reducer
// =============================================================================

const initialState: QuoteBuilderState = {
  currentStep: "details",
  title: "",
  description: "",
  customerName: "",
  customerEmail: "",
  validUntil: "",
  notes: "",
  internalNotes: "",
  discountPercent: 0,
  lineItems: [],
  savedQuoteId: null,
  quoteNumber: null,
  isProcessing: false,
  error: null,
};

function quoteBuilderReducer(
  state: QuoteBuilderState,
  action: QuoteBuilderAction
): QuoteBuilderState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };
    case "SET_TITLE":
      return { ...state, title: action.title };
    case "SET_DESCRIPTION":
      return { ...state, description: action.description };
    case "SET_CUSTOMER_NAME":
      return { ...state, customerName: action.customerName };
    case "SET_CUSTOMER_EMAIL":
      return { ...state, customerEmail: action.customerEmail };
    case "SET_VALID_UNTIL":
      return { ...state, validUntil: action.validUntil };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_INTERNAL_NOTES":
      return { ...state, internalNotes: action.internalNotes };
    case "SET_DISCOUNT_PERCENT":
      return { ...state, discountPercent: action.discountPercent };
    case "ADD_LINE_ITEM": {
      const existing = state.lineItems.find(
        (item) => item.product.id === action.item.product.id
      );
      if (existing) {
        return {
          ...state,
          lineItems: state.lineItems.map((item) =>
            item.product.id === action.item.product.id
              ? { ...item, quantity: item.quantity + action.item.quantity }
              : item
          ),
        };
      }
      return { ...state, lineItems: [...state.lineItems, action.item] };
    }
    case "UPDATE_LINE_ITEM":
      return {
        ...state,
        lineItems: state.lineItems.map((item) =>
          item.id === action.id ? { ...item, ...action.updates } : item
        ),
      };
    case "REMOVE_LINE_ITEM":
      return {
        ...state,
        lineItems: state.lineItems.filter((item) => item.id !== action.id),
      };
    case "CLEAR_LINE_ITEMS":
      return { ...state, lineItems: [] };
    case "SET_SAVED_QUOTE":
      return {
        ...state,
        savedQuoteId: action.quoteId,
        quoteNumber: action.quoteNumber,
      };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.isProcessing };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// =============================================================================
// Context
// =============================================================================

const QuoteBuilderContext = createContext<QuoteBuilderContextValue | null>(null);

const STEP_ORDER: QuoteBuilderStep[] = ["details", "products", "review", "confirmation"];

export function QuoteBuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quoteBuilderReducer, initialState);

  // Computed values
  const subtotal = state.lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const discountAmount = subtotal * (state.discountPercent / 100);

  const total = subtotal - discountAmount;

  // Step navigation
  const goToStep = (step: QuoteBuilderStep) => {
    dispatch({ type: "SET_STEP", step });
  };

  const nextStep = () => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      dispatch({ type: "SET_STEP", step: STEP_ORDER[currentIndex + 1] });
    }
  };

  const prevStep = () => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0) {
      dispatch({ type: "SET_STEP", step: STEP_ORDER[currentIndex - 1] });
    }
  };

  // Field setters
  const setTitle = (title: string) => dispatch({ type: "SET_TITLE", title });
  const setDescription = (description: string) =>
    dispatch({ type: "SET_DESCRIPTION", description });
  const setCustomerName = (customerName: string) =>
    dispatch({ type: "SET_CUSTOMER_NAME", customerName });
  const setCustomerEmail = (customerEmail: string) =>
    dispatch({ type: "SET_CUSTOMER_EMAIL", customerEmail });
  const setValidUntil = (validUntil: string) =>
    dispatch({ type: "SET_VALID_UNTIL", validUntil });
  const setNotes = (notes: string) => dispatch({ type: "SET_NOTES", notes });
  const setInternalNotes = (internalNotes: string) =>
    dispatch({ type: "SET_INTERNAL_NOTES", internalNotes });
  const setDiscountPercent = (discountPercent: number) =>
    dispatch({ type: "SET_DISCOUNT_PERCENT", discountPercent });

  // Line item operations
  const addProduct = (product: CatalogProduct) => {
    const price = parseFloat(product.effectivePrice);
    const item: QuoteLineItemDraft = {
      id: `${product.id}-${Date.now()}`,
      product,
      quantity: 1,
      unitPrice: price,
      originalPrice: price,
      priceOverride: false,
    };
    dispatch({ type: "ADD_LINE_ITEM", item });
  };

  const updateLineItem = (id: string, updates: Partial<QuoteLineItemDraft>) =>
    dispatch({ type: "UPDATE_LINE_ITEM", id, updates });

  const removeLineItem = (id: string) =>
    dispatch({ type: "REMOVE_LINE_ITEM", id });

  const clearLineItems = () => dispatch({ type: "CLEAR_LINE_ITEMS" });

  // Save result
  const setSavedQuote = (quoteId: string, quoteNumber: string) =>
    dispatch({ type: "SET_SAVED_QUOTE", quoteId, quoteNumber });

  // UI state
  const setProcessing = (isProcessing: boolean) =>
    dispatch({ type: "SET_PROCESSING", isProcessing });

  const setError = (error: string | null) =>
    dispatch({ type: "SET_ERROR", error });

  const reset = () => dispatch({ type: "RESET" });

  // Validation
  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case "details":
        return !!state.title.trim();
      case "products":
        return state.lineItems.length > 0;
      case "review":
        return true;
      default:
        return false;
    }
  };

  return (
    <QuoteBuilderContext.Provider
      value={{
        state,
        dispatch,
        goToStep,
        nextStep,
        prevStep,
        setTitle,
        setDescription,
        setCustomerName,
        setCustomerEmail,
        setValidUntil,
        setNotes,
        setInternalNotes,
        setDiscountPercent,
        addProduct,
        updateLineItem,
        removeLineItem,
        clearLineItems,
        setSavedQuote,
        setProcessing,
        setError,
        reset,
        canProceed,
        subtotal,
        discountAmount,
        total,
      }}
    >
      {children}
    </QuoteBuilderContext.Provider>
  );
}

export function useQuoteBuilder() {
  const context = useContext(QuoteBuilderContext);
  if (!context) {
    throw new Error("useQuoteBuilder must be used within a QuoteBuilderProvider");
  }
  return context;
}
