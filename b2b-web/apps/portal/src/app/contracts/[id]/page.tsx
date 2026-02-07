"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Calendar,
  Building2,
  User,
  FileText,
  DollarSign,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { ContractTimeline, VersionHistory, WorkflowActions } from "../components";
import {
  useContract,
  useContractVersions,
  formatDate,
  formatDateTime,
  formatCurrency,
  getStatusLabel,
  getStatusBadgeColor,
} from "../hooks";

import { Header } from "@/components/layout";

function ContractDetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Contract Details" />
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
          <div className="space-y-6">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-48 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <Header title="Contract Details" />
      <div className="flex-1 p-6">
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load contract details</p>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContractDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    data: contract,
    isLoading: contractLoading,
    error: contractError,
    refetch: refetchContract,
  } = useContract(id);

  const {
    data: versionsData,
    isLoading: versionsLoading,
  } = useContractVersions(id);

  const handleDownloadPdf = () => {
    // Placeholder for PDF download functionality
    alert("PDF download functionality will be implemented with the backend API.");
  };

  if (contractLoading) {
    return <ContractDetailSkeleton />;
  }

  if (contractError || !contract) {
    return <ContractDetailError onRetry={() => refetchContract()} />;
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Contract Details" />
      <div className="flex-1 p-6 space-y-6">
        {/* Back Button and Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/contracts")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contracts
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetchContract()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Workflow Actions */}
        <WorkflowActions
          contractId={contract.id}
          contractTitle={contract.title}
          status={contract.status}
          onSuccess={() => refetchContract()}
        />

        {/* Contract Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{contract.title}</h2>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeColor(contract.status)}`}
              >
                {getStatusLabel(contract.status)}
              </span>
            </div>
            <p className="text-muted-foreground font-mono">
              {contract.contractNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(contract.totalValue, contract.currency)}
            </p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Contract Details and Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contract.description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="mt-1">{contract.description}</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Start Date</span>
                      <p className="font-medium">{formatDate(contract.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">End Date</span>
                      <p className="font-medium">{formatDate(contract.endDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Organization</span>
                      <p className="font-medium">{contract.organizationName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Currency</span>
                      <p className="font-medium">{contract.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Created By</span>
                      <p className="font-medium">{contract.createdByName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-sm text-muted-foreground">Version</span>
                      <p className="font-medium">v{contract.version}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p>{formatDateTime(contract.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated</span>
                    <p>{formatDateTime(contract.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Version History */}
            <VersionHistory
              versions={versionsData?.data || []}
              isLoading={versionsLoading}
            />
          </div>

          {/* Right Column - Timeline and Quick Info */}
          <div className="space-y-6">
            {/* Contract Timeline */}
            <Card>
              <CardContent className="pt-6">
                <ContractTimeline contract={contract} />
              </CardContent>
            </Card>

            {/* Key Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">
                    {formatDate(contract.createdAt)}
                  </span>
                </div>
                {contract.submittedAt && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Submitted</span>
                    <span className="text-sm font-medium">
                      {formatDate(contract.submittedAt)}
                    </span>
                  </div>
                )}
                {contract.approvedAt && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <span className="text-sm font-medium">
                      {formatDate(contract.approvedAt)}
                    </span>
                  </div>
                )}
                {contract.activatedAt && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Activated</span>
                    <span className="text-sm font-medium">
                      {formatDate(contract.activatedAt)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Start Date</span>
                  <span className="text-sm font-medium">
                    {formatDate(contract.startDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">End Date</span>
                  <span className="text-sm font-medium">
                    {formatDate(contract.endDate)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContractDetailPage() {
  return (
    <RequireAuth
      fallback={<ContractDetailSkeleton />}
      redirectTo="/login"
    >
      <ContractDetailContent />
    </RequireAuth>
  );
}
