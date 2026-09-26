"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { getDeviceId, setAuthUserIdentifier } from "@/lib/readerStorage";
import LogoIcon from "@/components/svg/icons/LogoIcon";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function handleAuth() {
      try {
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } =
            await supabaseBrowser.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabaseBrowser.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setAuthUserIdentifier(session.user.id);

          // Sync guest highlights & notes
          try {
            const deviceId = getDeviceId();
            await fetch("/api/auth/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: session.user.id,
                email: session.user.email,
                name:
                  session.user.user_metadata?.full_name ||
                  session.user.user_metadata?.name ||
                  session.user.email?.split("@")[0] ||
                  "User",
                deviceId,
              }),
            });
          } catch (syncErr) {
            console.error("Sync error during callback:", syncErr);
          }

          if (!isCancelled) {
            const nextUrl = searchParams.get("next") || "/home";
            router.replace(nextUrl);
          }
        } else {
          // If no immediate session, give auth state change a moment
          const {
            data: { subscription },
          } = supabaseBrowser.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession?.user && !isCancelled) {
              setAuthUserIdentifier(newSession.user.id);
              subscription.unsubscribe();
              const nextUrl = searchParams.get("next") || "/home";
              router.replace(nextUrl);
            }
          });

          // Timeout fallback
          setTimeout(() => {
            if (!isCancelled) {
              router.replace("/home");
            }
          }, 3000);
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (!isCancelled) {
          setErrorMsg(err.message || "Failed to complete authentication");
        }
      }
    }

    handleAuth();

    return () => {
      isCancelled = true;
    };
  }, [router, searchParams]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <div className="p-6 max-w-md w-full bg-card border border-border rounded-xl text-center space-y-4">
          <LogoIcon size={36} className="text-accent mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Authentication Issue</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => router.replace("/home")}
            className="w-full py-2 px-4 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
      <div className="flex flex-col items-center space-y-4 animate-fade-in text-center">
        <LogoIcon size={44} className="text-accent animate-pulse" />
        <h2 className="text-lg font-medium tracking-tight">Syncing your library...</h2>
        <p className="text-xs text-muted-foreground max-w-xs">
          Connecting your account and synchronizing highlights and notes.
        </p>
      </div>
    </div>
  );
}
