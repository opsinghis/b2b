"use client";

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@b2b/ui";
import {
  Users,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  useTeamMembers,
  type TeamMember,
} from "../hooks";

interface TeamMemberSelectorProps {
  selectedMemberId: string | null;
  onSelectMember: (member: TeamMember | null) => void;
  label?: string;
  placeholder?: string;
  showStats?: boolean;
  disabled?: boolean;
  className?: string;
}

export function TeamMemberSelector({
  selectedMemberId,
  onSelectMember,
  label = "Select Team Member",
  placeholder = "Choose a team member...",
  showStats = true,
  disabled = false,
  className,
}: TeamMemberSelectorProps) {
  const { data: members, isLoading, isError, refetch } = useTeamMembers();

  const teamMembers = members?.filter((m) => m.isActive) ?? [];
  const selectedMember = teamMembers.find((m) => m.userId === selectedMemberId);

  const handleValueChange = (value: string) => {
    if (value === "none") {
      onSelectMember(null);
    } else {
      const member = teamMembers.find((m) => m.userId === value);
      onSelectMember(member ?? null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/30">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading team members...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-md border border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Failed to load team members</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/30">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No team members available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Select
        value={selectedMemberId ?? "none"}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedMember ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {selectedMember.firstName?.[0]?.toUpperCase() || selectedMember.email[0]?.toUpperCase()}
                </div>
                <span>
                  {selectedMember.firstName} {selectedMember.lastName}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>No team member selected</span>
            </div>
          </SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {member.firstName?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {member.firstName} {member.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selected member stats */}
      {showStats && selectedMember && (
        <TeamMemberStats member={selectedMember} />
      )}
    </div>
  );
}

function TeamMemberStats({ member }: { member: TeamMember }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Orders:</span>
        <span className="font-medium">{member.totalOrders}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Total Spend:</span>
        <span className="font-medium">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(member.totalSpend)}
        </span>
      </div>
    </div>
  );
}

export function TeamMemberSelectorSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      <div className="h-10 bg-muted rounded animate-pulse" />
    </div>
  );
}
