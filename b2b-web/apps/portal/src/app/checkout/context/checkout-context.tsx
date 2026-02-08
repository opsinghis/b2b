"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";

import type { UserAddress, DeliveryMethod, PaymentMethod as PaymentMethodData } from "../hooks";

// =============================================================================
// Types
// =============================================================================

export type CheckoutStep =
  | "address"
  | "delivery"
  | "payment"
  | "review"
  | "confirmation";

export type PaymentMethodType = "invoice" | "credit_card" | "purchase_order" | "salary_deduction";

export interface CheckoutState {
  currentStep: CheckoutStep;
  shippingAddress: UserAddress | null;
  billingAddress: UserAddress | null;
  useSameAsBilling: boolean;
  deliveryMethod: DeliveryMethod | null;
  paymentMethodType: PaymentMethodType;
  selectedPaymentMethod: PaymentMethodData | null;
  purchaseOrderNumber: string;
  orderNotes: string;
  termsAccepted: boolean;
  orderId: string | null;
  isProcessing: boolean;
  error: string | null;
}

type CheckoutAction =
  | { type: "SET_STEP"; step: CheckoutStep }
  | { type: "SET_SHIPPING_ADDRESS"; address: UserAddress | null }
  | { type: "SET_BILLING_ADDRESS"; address: UserAddress | null }
  | { type: "SET_USE_SAME_AS_BILLING"; value: boolean }
  | { type: "SET_DELIVERY_METHOD"; method: DeliveryMethod | null }
  | { type: "SET_PAYMENT_METHOD_TYPE"; methodType: PaymentMethodType }
  | { type: "SET_SELECTED_PAYMENT_METHOD"; method: PaymentMethodData | null }
  | { type: "SET_PURCHASE_ORDER_NUMBER"; value: string }
  | { type: "SET_ORDER_NOTES"; notes: string }
  | { type: "SET_TERMS_ACCEPTED"; accepted: boolean }
  | { type: "SET_ORDER_ID"; orderId: string | null }
  | { type: "SET_PROCESSING"; isProcessing: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

interface CheckoutContextValue {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
  // Convenience methods
  goToStep: (step: CheckoutStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setShippingAddress: (address: UserAddress | null) => void;
  setBillingAddress: (address: UserAddress | null) => void;
  setUseSameAsBilling: (value: boolean) => void;
  setDeliveryMethod: (method: DeliveryMethod | null) => void;
  setPaymentMethodType: (methodType: PaymentMethodType) => void;
  setSelectedPaymentMethod: (method: PaymentMethodData | null) => void;
  setPurchaseOrderNumber: (value: string) => void;
  setOrderNotes: (notes: string) => void;
  setTermsAccepted: (accepted: boolean) => void;
  setOrderId: (orderId: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  canProceed: () => boolean;
}

// =============================================================================
// Initial State & Reducer
// =============================================================================

const initialState: CheckoutState = {
  currentStep: "address",
  shippingAddress: null,
  billingAddress: null,
  useSameAsBilling: true,
  deliveryMethod: null,
  paymentMethodType: "invoice",
  selectedPaymentMethod: null,
  purchaseOrderNumber: "",
  orderNotes: "",
  termsAccepted: false,
  orderId: null,
  isProcessing: false,
  error: null,
};

function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction
): CheckoutState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step, error: null };
    case "SET_SHIPPING_ADDRESS":
      return { ...state, shippingAddress: action.address };
    case "SET_BILLING_ADDRESS":
      return { ...state, billingAddress: action.address };
    case "SET_USE_SAME_AS_BILLING":
      return { ...state, useSameAsBilling: action.value };
    case "SET_DELIVERY_METHOD":
      return { ...state, deliveryMethod: action.method };
    case "SET_PAYMENT_METHOD_TYPE":
      return { ...state, paymentMethodType: action.methodType };
    case "SET_SELECTED_PAYMENT_METHOD":
      return { ...state, selectedPaymentMethod: action.method };
    case "SET_PURCHASE_ORDER_NUMBER":
      return { ...state, purchaseOrderNumber: action.value };
    case "SET_ORDER_NOTES":
      return { ...state, orderNotes: action.notes };
    case "SET_TERMS_ACCEPTED":
      return { ...state, termsAccepted: action.accepted };
    case "SET_ORDER_ID":
      return { ...state, orderId: action.orderId };
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

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

const STEP_ORDER: CheckoutStep[] = [
  "address",
  "delivery",
  "payment",
  "review",
  "confirmation",
];

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);

  const goToStep = (step: CheckoutStep) => {
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

  const setShippingAddress = (address: UserAddress | null) => {
    dispatch({ type: "SET_SHIPPING_ADDRESS", address });
  };

  const setBillingAddress = (address: UserAddress | null) => {
    dispatch({ type: "SET_BILLING_ADDRESS", address });
  };

  const setUseSameAsBilling = (value: boolean) => {
    dispatch({ type: "SET_USE_SAME_AS_BILLING", value });
  };

  const setDeliveryMethod = (method: DeliveryMethod | null) => {
    dispatch({ type: "SET_DELIVERY_METHOD", method });
  };

  const setPaymentMethodType = (methodType: PaymentMethodType) => {
    dispatch({ type: "SET_PAYMENT_METHOD_TYPE", methodType });
  };

  const setSelectedPaymentMethod = (method: PaymentMethodData | null) => {
    dispatch({ type: "SET_SELECTED_PAYMENT_METHOD", method });
  };

  const setPurchaseOrderNumber = (value: string) => {
    dispatch({ type: "SET_PURCHASE_ORDER_NUMBER", value });
  };

  const setOrderNotes = (notes: string) => {
    dispatch({ type: "SET_ORDER_NOTES", notes });
  };

  const setTermsAccepted = (accepted: boolean) => {
    dispatch({ type: "SET_TERMS_ACCEPTED", accepted });
  };

  const setOrderId = (orderId: string | null) => {
    dispatch({ type: "SET_ORDER_ID", orderId });
  };

  const setProcessing = (isProcessing: boolean) => {
    dispatch({ type: "SET_PROCESSING", isProcessing });
  };

  const setError = (error: string | null) => {
    dispatch({ type: "SET_ERROR", error });
  };

  const reset = () => {
    dispatch({ type: "RESET" });
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case "address":
        return !!state.shippingAddress;
      case "delivery":
        return !!state.deliveryMethod;
      case "payment":
        // Must have a payment method selected
        if (!state.selectedPaymentMethod) {
          return false;
        }
        // PO requires PO number
        if (state.paymentMethodType === "purchase_order") {
          return !!state.purchaseOrderNumber.trim();
        }
        return true;
      case "review":
        return state.termsAccepted;
      default:
        return false;
    }
  };

  return (
    <CheckoutContext.Provider
      value={{
        state,
        dispatch,
        goToStep,
        nextStep,
        prevStep,
        setShippingAddress,
        setBillingAddress,
        setUseSameAsBilling,
        setDeliveryMethod,
        setPaymentMethodType,
        setSelectedPaymentMethod,
        setPurchaseOrderNumber,
        setOrderNotes,
        setTermsAccepted,
        setOrderId,
        setProcessing,
        setError,
        reset,
        canProceed,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}
