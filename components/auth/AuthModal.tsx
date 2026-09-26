"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/providers/AuthContext";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import { Loader2, Mail, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signInWithGoogle, signInWithOtp } =
    useAuth();
  const [email, setEmail] = useState("");
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmittingGoogle(true);
      await signInWithGoogle();
    } catch (err) {
      setIsSubmittingGoogle(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmittingEmail(true);
      const { error } = await signInWithOtp(email);
      if (error) {
        toast.error(`Email Sign-In: ${error.message}`);
      } else {
        setEmailSent(true);
        toast.success("Magic link sent! Please check your email.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send magic link");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="max-w-md w-full p-6 bg-card border-border text-foreground rounded-2xl shadow-xl">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <LogoIcon size={28} />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Sign in to Al-Juthur
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Synchronize your highlights, notes, and reading history across all your devices.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmittingGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-accent/10 text-foreground font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
          >
            {isSubmittingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Minimalist Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-border w-full"></div>
            <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
              or
            </span>
          </div>

          {/* Email Magic Link Form */}
          {emailSent ? (
            <div className="rounded-xl border border-border bg-accent/5 p-4 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-accent mx-auto" />
              <h4 className="text-sm font-semibold text-foreground">Sign-in link sent</h4>
              <p className="text-xs text-muted-foreground">
                We sent a secure magic link to <span className="font-medium text-foreground">{email}</span>. Click the link in your email to sign in.
              </p>
              <button
                type="button"
                onClick={() => setEmailSent(false)}
                className="text-xs text-accent hover:underline mt-2 inline-block"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                  required
                />
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>

              <button
                type="submit"
                disabled={isSubmittingEmail}
                className="w-full py-2 px-4 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmittingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Send Magic Link</span>
              </button>
            </form>
          )}

          {/* Device Migration Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent/5 border border-border/50 text-xs text-muted-foreground mt-4">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p>
              Your existing notes and highlights on this device will be automatically linked to your account upon signing in.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
