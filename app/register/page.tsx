"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);
  const [database, setDatabase] = useState(true);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d) => {
        setGoogleOn(!!d.google);
        setDatabase(!!d.database);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Registration failed");
      }
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </>
      }
    >
      {database && (
        <div className="grid gap-2 mb-4">
          <a
            className="btn-ghost btn w-full"
            href={googleOn ? "/api/auth/oauth/google/start?next=/onboarding" : undefined}
            onClick={(e) => {
              if (!googleOn) {
                e.preventDefault();
                setError(
                  "Google sign-in needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in Vercel. Use email for now."
                );
              }
            }}
          >
            Continue with Google
          </a>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button className="btn w-full" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
