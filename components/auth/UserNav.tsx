"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/providers/AuthContext";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  User as UserIcon,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Cloud,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export default function UserNav() {
  const { user, loading, openAuthModal, signOut, syncAccountData } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-accent/10 animate-pulse border border-border" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={openAuthModal}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent/10 text-foreground transition-all duration-200"
        title="Sign in to sync your notes and highlights across devices"
      >
        <Cloud className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="hidden sm:inline">Sign in to Sync</span>
        <span className="sm:hidden">Sync</span>
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await syncAccountData();
      toast.success("Library synced successfully");
    } catch {
      toast.error("Failed to sync library");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 p-1 rounded-full sm:rounded-lg sm:px-2.5 sm:py-1 border border-border bg-card hover:bg-accent/10 transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="User menu"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
              {initial}
            </div>
          )}
          <span className="hidden sm:inline text-xs font-medium text-foreground max-w-[100px] truncate">
            {displayName}
          </span>
          <ChevronDown className="hidden sm:inline w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 p-3 bg-card border-border text-foreground shadow-lg rounded-xl"
      >
        <div className="flex flex-col space-y-3">
          {/* User info */}
          <div className="border-b border-border pb-3">
            <p className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Cloud Sync Active</span>
            </div>
          </div>

          {/* Sync action */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-accent/10 text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-muted-foreground ${
                isSyncing ? "animate-spin text-accent" : ""
              }`}
            />
            <span>{isSyncing ? "Syncing..." : "Sync Library Now"}</span>
          </button>

          {/* Sign out action */}
          <button
            onClick={async () => {
              setPopoverOpen(false);
              await signOut();
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
