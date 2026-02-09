"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContractForm } from "../components/contract-form";
import {
  CreateContractData,
  useCreateContract,
  useSubmitContract,
} from "../hooks";

function NewContractContent() {
  const router = useRouter();
  const createMutation = useCreateContract();
  const submitMutation = useSubmitContract();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async (data: CreateContractData) => {
    try {
      const contract = await createMutation.mutateAsync(data);
      setSuccessMessage("Contract saved as draft successfully!");
      // Navigate to the contract detail page after a brief delay
      setTimeout(() => {
        router.push(`/contracts/${contract.id}`);
      }, 1500);
    } catch {
      // Error handled by mutation
    }
  };

  const handleSaveAndSubmit = async (data: CreateContractData) => {
    try {
      // First create the contract
      const contract = await createMutation.mutateAsync(data);
      // Then submit it for review
      await submitMutation.mutateAsync({ id: contract.id });
      setSuccessMessage("Contract created and submitted for review!");
      // Navigate to the contract detail page after a brief delay
      setTimeout(() => {
        router.push(`/contracts/${contract.id}`);
      }, 1500);
    } catch {
      // Error handled by mutation
    }
  };

  const error = createMutation.error || submitMutation.error;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/contracts")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contracts
          </Button>
        </div>

        {/* Page Title */}
        <div>
          <h2 className="text-2xl font-bold">New Contract</h2>
          <p className="text-muted-foreground">
            Create a new contract and save as draft or submit for review.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
            <p className="text-sm font-medium text-destructive">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        )}

        {/* Contract Form */}
        <ContractForm
          onSave={handleSave}
          onSaveAndSubmit={handleSaveAndSubmit}
          isSaving={createMutation.isPending && !submitMutation.isPending}
          isSubmitting={submitMutation.isPending}
        />
      </div>
    </div>
  );
}

function NewContractSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="space-y-4">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

export default function NewContractPage() {
  return (
    <RequireAuth
      fallback={<NewContractSkeleton />}
      redirectTo="/login"
    >
      <NewContractContent />
    </RequireAuth>
  );
}
