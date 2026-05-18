"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import LineIcon from "@/components/ui/LineIcons";

type AuthState = "idle" | "sending" | "sent" | "error";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    setNextPath(next || "/dashboard");
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(nextPath);
    });
  }, [nextPath, router]);

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setAuthState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setAuthState("error");
    } else {
      setAuthState("sent");
    }
  };

  const signInWithGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`,
      },
    });
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="mb-12 text-center"
      >
        <p className="font-anta text-3xl text-foreground tracking-tight">EchoFlow</p>
        <p className="text-xs text-muted font-league uppercase tracking-widest mt-1">
          AI Pronunciation Coach
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Loading / sending state */}
        {authState === "sending" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.9, repeat: Infinity }}>
              <LineIcon name="shadowing" size={42} />
            </motion.div>
            <p className="text-sm font-league text-muted">Sending link…</p>
          </motion.div>
        )}

        {/* Sent confirmation */}
        {authState === "sent" && (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 text-center max-w-sm"
          >
            <LineIcon name="phoneme" size={44} />
            <div>
              <p className="font-league font-bold text-foreground">Check your inbox</p>
              <p className="text-sm text-muted font-league mt-1">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.
              </p>
            </div>
            <button
              onClick={() => setAuthState("idle")}
              className="text-xs text-muted font-league hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </motion.div>
        )}

        {/* Main form */}
        {(authState === "idle" || authState === "error") && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col gap-4"
          >
            <div className="section-rule py-3 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
                Passwordless Sign In
              </span>
              <LineIcon name="interference" size={22} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-league text-muted uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                placeholder="you@company.com"
                className="w-full px-0 py-3 font-league text-sm text-foreground bg-transparent border-b border-foreground/60 outline-none focus:border-bauhaus-blue transition-colors placeholder:text-muted"
                autoFocus
              />
            </div>

            {authState === "error" && (
              <p className="text-xs font-league text-bauhaus-red">{errorMsg}</p>
            )}

            {/* Magic link button */}
            <button
              onClick={sendMagicLink}
              disabled={!email.trim()}
              className="w-full py-3 btn-bauhaus text-sm uppercase tracking-widest disabled:opacity-30"
            >
              Send Magic Link
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted font-league">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google OAuth */}
            <button
              onClick={signInWithGoogle}
              className="w-full py-3 border border-foreground text-foreground font-league font-bold text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-[10px] text-muted font-league leading-relaxed">
              By signing in you agree to our terms of service. Your audio data is processed ephemerally and never stored without consent.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
