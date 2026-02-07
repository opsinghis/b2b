"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@b2b/ui";
import { Eye, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  type ContractDto,
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusBadgeColor,
} from "../hooks";

interface ContractsTableProps {
  contracts: ContractDto[];
}

export function ContractsTable({ contracts }: ContractsTableProps) {
  const router = useRouter();

  const handleViewContract = (id: string) => {
    router.push(`/contracts/${id}`);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contract #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No contracts found.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            contracts.map((contract) => (
              <TableRow
                key={contract.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewContract(contract.id)}
              >
                <TableCell className="font-mono text-sm">
                  {contract.contractNumber}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{contract.title}</span>
                    {contract.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {contract.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(contract.status)}`}
                  >
                    {getStatusLabel(contract.status)}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(contract.totalValue, contract.currency)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(contract.startDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(contract.endDate)}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{contract.organizationName}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewContract(contract.id);
                    }}
                    title="View contract"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
