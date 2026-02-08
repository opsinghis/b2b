"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, cn } from "@b2b/ui";
import {
  FileText,
  Video,
  ExternalLink,
  BookOpen,
  Download,
  FolderOpen,
  File,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  usePartnerResources,
  formatFileSize,
  formatDate,
  type PartnerResource,
} from "../hooks";

const resourceTypeIcons: Record<PartnerResource["type"], React.ReactNode> = {
  DOCUMENT: <FileText className="h-5 w-5" />,
  VIDEO: <Video className="h-5 w-5" />,
  LINK: <ExternalLink className="h-5 w-5" />,
  GUIDE: <BookOpen className="h-5 w-5" />,
};

const resourceTypeColors: Record<PartnerResource["type"], string> = {
  DOCUMENT: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  VIDEO: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  LINK: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  GUIDE: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export function PartnerResources() {
  const { data: resources, isLoading, isError, refetch } = usePartnerResources();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const groupedResources = useMemo(() => {
    if (!resources) return {};
    return resources.reduce<Record<string, PartnerResource[]>>((acc, resource) => {
      const category = resource.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(resource);
      return acc;
    }, {});
  }, [resources]);

  const categories = useMemo(() => {
    return ["all", ...Object.keys(groupedResources)];
  }, [groupedResources]);

  const filteredResources = useMemo(() => {
    if (!resources) return [];
    if (selectedCategory === "all") return resources;
    return resources.filter((r) => (r.category || "General") === selectedCategory);
  }, [resources, selectedCategory]);

  if (isLoading) {
    return <PartnerResourcesSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Partner Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load partner resources
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const resourcesList = filteredResources ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Partner Resources
          <span className="text-sm font-normal text-muted-foreground">
            ({resources?.length ?? 0} resources)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        {categories.length > 2 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full transition-colors",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category === "all" ? "All" : category}
              </button>
            ))}
          </div>
        )}

        {/* Resources List */}
        {resourcesList.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {resourcesList.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <File className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No resources available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Partner resources will appear here when added by your administrator
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResourceCard({ resource }: { resource: PartnerResource }) {
  const handleClick = () => {
    if (resource.type === "LINK") {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    } else {
      // For documents and other files, trigger download
      const link = document.createElement("a");
      link.href = resource.url;
      link.download = resource.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left w-full group"
    >
      <div
        className={cn(
          "p-2 rounded-lg shrink-0",
          resourceTypeColors[resource.type]
        )}
      >
        {resourceTypeIcons[resource.type]}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {resource.name}
          </h4>
          {resource.type === "LINK" ? (
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <Download className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        {resource.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {resource.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{resource.type.toLowerCase()}</span>
          {resource.fileSize && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <span>{formatFileSize(resource.fileSize)}</span>
            </>
          )}
          <span className="text-muted-foreground/50">|</span>
          <span>{formatDate(resource.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

export function PartnerResourcesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-muted rounded-full animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-lg border"
            >
              <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
