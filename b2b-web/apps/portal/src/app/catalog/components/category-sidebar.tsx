"use client";

import { Button } from "@b2b/ui";
import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { useState } from "react";

import { CategoryDto } from "../hooks";

interface CategorySidebarProps {
  categories: CategoryDto[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string | undefined) => void;
  isLoading?: boolean;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading,
}: CategorySidebarProps) {
  if (isLoading) {
    return <CategorySidebarSkeleton />;
  }

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground px-3 py-2">
        Categories
      </h3>

      {/* All Products */}
      <Button
        variant={!selectedCategoryId ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSelectCategory(undefined)}
      >
        <FolderOpen className="h-4 w-4 mr-2" />
        All Products
      </Button>

      {/* Category Tree */}
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={onSelectCategory}
          level={0}
        />
      ))}
    </div>
  );
}

interface CategoryItemProps {
  category: CategoryDto;
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string | undefined) => void;
  level: number;
}

function CategoryItem({
  category,
  selectedCategoryId,
  onSelectCategory,
  level,
}: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedCategoryId === category.id;

  // Check if any child is selected
  const hasSelectedChild = hasChildren && category.children?.some(
    (child) => child.id === selectedCategoryId ||
    (child.children?.some((grandChild) => grandChild.id === selectedCategoryId))
  );

  // Auto-expand if a child is selected
  const shouldExpand = isExpanded || hasSelectedChild;

  return (
    <div style={{ marginLeft: level * 12 }}>
      <div className="flex items-center">
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {shouldExpand ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button
          variant={isSelected ? "secondary" : "ghost"}
          className={`flex-1 justify-start ${!hasChildren ? "ml-8" : ""}`}
          onClick={() => onSelectCategory(category.id)}
        >
          <span className="truncate">{category.name}</span>
          {category.productCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              ({category.productCount})
            </span>
          )}
        </Button>
      </div>

      {/* Children */}
      {hasChildren && shouldExpand && (
        <div className="mt-1">
          {category.children?.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySidebarSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded w-24 mx-3 my-2" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-9 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}
