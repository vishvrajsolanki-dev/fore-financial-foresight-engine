"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<{
    database: boolean;
    google: boolean;
    microsoft: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => setProviders({ database: false, google: false, microsoft: false }));
  }, []);

  useEffect(() => {
    const err = params.get("error");
    if (err === "google_not_configured") {
      setError("Google sign-in is not configured on this deployment yet.");
    } else if (err === "email_unverified") {
      setError("Email not verified with the provider.");
    } else if (err === "microsoft_not_configured") {
      setError("Microsoft sign-in is not configured on this deployment yet.");
    }
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      const next = params.get("next") || "/past";
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  const db = providers?.database !== false;

  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          No account?{" "}
          <Link href="/register" style={{ color: "var(--accent)" }}>
            Create account
          </Link>
          {" · "}
          <Link href="/forgot-password" style={{ color: "var(--accent)" }}>
            Forgot password
          </Link>
        </>
      }
    >
      {/* Always surface Google when in full-stack mode — matches product expectation */}
      {db && (
        <div className="grid gap-2 mb-4">
          <a
            className="btn-ghost btn w-full"
            href={
              providers?.google
                ? `/api/auth/oauth/google/start?next=${encodeURIComponent(params.get("next") || "/past")}`
                : undefined
            }
            onClick={(e) => {
              if (!providers?.google) {
                e.preventDefault();
                setError(
                  "Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel env. Email login works now."
                );
              }
            }}
            aria-disabled={!providers?.google}
            style={!providers?.google ? { opacity: 0.85 } : undefined}
          >
            Continue with Google
          </a>
          {providers?.microsoft && (
            <a
              className="btn-ghost btn w-full"
              href={`/api/auth/oauth/microsoft/start?next=${encodeURIComponent(params.get("next") || "/past")}`}
            >
              Continue with Microsoft
            </a>
          )}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="muted text-xs">or email</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          Email
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Password
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button className="btn w-full" disabled={busy || providers?.database === false}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <Link href="/onboarding" className="btn-ghost btn w-full mt-3 text-center">
        Explore with demo data
      </Link>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Sign in">
          <p className="muted">Loading…</p>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
