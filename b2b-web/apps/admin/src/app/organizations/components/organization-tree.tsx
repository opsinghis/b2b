"use client";

import type { OrganizationHierarchyResponseDto } from "@b2b/api-client";
import { Button, cn } from "@b2b/ui";
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Edit,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

interface TreeNodeProps {
  node: OrganizationHierarchyResponseDto;
  level: number;
  onSelectOrg?: (org: OrganizationHierarchyResponseDto) => void;
  selectedId?: string;
}

function TreeNode({ node, level, onSelectOrg, selectedId }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const router = useRouter();
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-1.5 px-2 rounded-md transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-accent cursor-pointer"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            "p-0.5 rounded hover:bg-accent-foreground/10",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        <Building2
          className={cn(
            "h-4 w-4",
            node.isActive ? "text-primary" : "text-muted-foreground"
          )}
        />

        {/* Name and Code */}
        <div
          className="flex-1 flex items-center gap-2 cursor-pointer"
          onClick={() => onSelectOrg?.(node)}
        >
          <span className={cn("text-sm font-medium", !node.isActive && "text-muted-foreground")}>
            {node.name}
          </span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {node.code}
          </code>
          {!node.isActive && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-muted-foreground">
              Inactive
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/organizations/${node.id}`);
            }}
            title="Edit organization"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/organizations/${node.id}?tab=users`);
            }}
            title="Manage users"
          >
            <Users className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelectOrg={onSelectOrg}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganizationTreeProps {
  hierarchy: OrganizationHierarchyResponseDto[];
  onSelectOrg?: (org: OrganizationHierarchyResponseDto) => void;
  selectedId?: string;
  className?: string;
}

export function OrganizationTree({
  hierarchy,
  onSelectOrg,
  selectedId,
  className,
}: OrganizationTreeProps) {
  if (!hierarchy || hierarchy.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No organizations found</p>
        <p className="text-sm">Create your first organization to get started</p>
      </div>
    );
  }

  return (
    <div className={cn("py-2", className)}>
      {hierarchy.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          onSelectOrg={onSelectOrg}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
