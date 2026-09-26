"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { getDeviceId, setAuthUserIdentifier } from "@/lib/readerStorage";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  syncAccountData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const syncAccountData = async (targetUser?: User | null) => {
    const activeUser = targetUser !== undefined ? targetUser : user;
    if (!activeUser) return;

    try {
      const deviceId = getDeviceId();
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUser.id,
          email: activeUser.email,
          name:
            activeUser.user_metadata?.full_name ||
            activeUser.user_metadata?.name ||
            activeUser.email?.split("@")[0] ||
            "User",
          deviceId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const totalMigrated =
          (data.migrated?.highlights || 0) + (data.migrated?.notes || 0);
        if (totalMigrated > 0) {
          toast.success(
            `Synced ${totalMigrated} existing highlights and notes to your account.`
          );
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("aljuthur-auth-changed"));
        }
      }
    } catch (err) {
      console.error("[AUTH] Sync error:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Fetch initial session
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthUserIdentifier(session.user.id);
        syncAccountData(session.user);
      } else {
        setAuthUserIdentifier(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);

      if (newUser) {
        setAuthUserIdentifier(newUser.id);
        await syncAccountData(newUser);
      } else {
        setAuthUserIdentifier(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("aljuthur-auth-changed"));
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const redirectOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectOrigin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(`Google Sign-In: ${error.message}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate Google sign in");
    }
  };

  const signInWithOtp = async (email: string) => {
    try {
      const redirectOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${redirectOrigin}/auth/callback`,
        },
      });
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      setAuthUserIdentifier(null);
      setUser(null);
      setSession(null);
      toast.info("Signed out successfully");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("aljuthur-auth-changed"));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign out");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signInWithOtp,
        signOut,
        syncAccountData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
