"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ database: boolean; google: boolean; microsoft: boolean } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => setProviders({ database: false, google: false, microsoft: false }));
  }, []);

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
      router.push(params.get("next") || "/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

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
      {params.get("error") === "email_unverified" && (
        <p className="pill pill-warn mb-3 w-full justify-center">Email not verified with provider</p>
      )}
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          Email
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Password
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn w-full" disabled={busy || providers?.database === false}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {providers?.google && (
        <a className="btn-ghost btn w-full mt-3" href="/api/auth/oauth/google/start">
          Continue with Google
        </a>
      )}
      {providers?.microsoft && (
        <a className="btn-ghost btn w-full mt-2" href="/api/auth/oauth/microsoft/start">
          Continue with Microsoft
        </a>
      )}
      <Link href="/onboarding" className="btn-ghost btn w-full mt-3 text-center">
        Explore with demo data
      </Link>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Sign in"><p className="muted">Loading…</p></AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}
