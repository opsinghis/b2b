"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  cn,
} from "@b2b/ui";
import {
  Users,
  UserPlus,
  User,
  ShoppingBag,
  DollarSign,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import {
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  formatPrice,
  type TeamMember,
} from "../hooks";

export function TeamMembersList() {
  const [showAddForm, setShowAddForm] = useState(false);
  const { data: members, isLoading, isError, refetch } = useTeamMembers();

  if (isLoading) {
    return <TeamMembersListSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load team members
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const teamMembers = members ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
          <span className="text-sm font-normal text-muted-foreground">
            ({teamMembers.length})
          </span>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Member Form */}
        {showAddForm && (
          <AddTeamMemberForm onComplete={() => setShowAddForm(false)} />
        )}

        {/* Team Members List */}
        {teamMembers.length > 0 ? (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No team members yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add team members to place orders on their behalf
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddTeamMemberForm({ onComplete }: { onComplete: () => void }) {
  const [userId, setUserId] = useState("");
  const { mutate: addMember, isPending, isSuccess, isError, error, reset } = useAddTeamMember();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    addMember({ userId: userId.trim() }, {
      onSuccess: () => {
        setUserId("");
        setTimeout(() => {
          reset();
          onComplete();
        }, 1500);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg border bg-muted/30">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium">Add Team Member by User ID</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter user ID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="pl-10"
              disabled={isPending || isSuccess}
            />
          </div>
          <Button type="submit" disabled={isPending || isSuccess || !userId.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSuccess ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
        {isSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Team member added successfully
          </p>
        )}
        {isError && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <XCircle className="h-4 w-4" />
            {(error as Error)?.message || "Failed to add team member"}
          </p>
        )}
      </div>
    </form>
  );
}

function TeamMemberRow({ member }: { member: TeamMember }) {
  const { mutate: removeMember, isPending } = useRemoveTeamMember();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRemove = () => {
    removeMember(member.userId, {
      onSuccess: () => setShowConfirm(false),
    });
  };

  const fullName = `${member.firstName} ${member.lastName}`.trim() || member.email;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
            member.isActive
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {member.firstName?.[0]?.toUpperCase() || member.email[0]?.toUpperCase()}
          {member.lastName?.[0]?.toUpperCase() || ""}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{fullName}</span>
          <span className="text-xs text-muted-foreground">{member.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Stats */}
        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ShoppingBag className="h-4 w-4" />
            <span>{member.totalOrders} orders</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>{formatPrice(member.totalSpend)}</span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            member.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          )}
        >
          {member.isActive ? "Active" : "Inactive"}
        </span>

        {/* Remove Button */}
        {showConfirm ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function TeamMembersListSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-8 w-28 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
