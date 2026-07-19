"use client";

// FORE — app/login/page.tsx
// Warm Ledger auth screen: real Google/Microsoft OAuth (when configured) + email/password.
// Without DATABASE_URL, "Explore demo" uses client-side personas — no fake OAuth.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

type Provider = "google" | "microsoft";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.16 7.16 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
    </svg>
  );
}

const FEATURES = [
  {
    title: "PAST — archetype assigned",
    blurb:
      "We assign one of five archetypes from your spend mix (Euclidean nearest centroid) — you never pick a persona.",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
  {
    title: "DECIDE — ask \u201ccan I afford it?\u201d",
    blurb:
      "A chat that calls a real canIAfford() function — the verdict is computed from your data, never a guessed number.",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "AHEAD — pace your goals",
    blurb:
      "A goal pace calculator plus a peer benchmark, so you know if you're on track and how you compare.",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
];

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured on this deployment.",
  microsoft_not_configured: "Microsoft sign-in is not configured on this deployment.",
  google_oauth_failed: "Google sign-in failed. Try again or use email.",
  microsoft_oauth_failed: "Microsoft sign-in failed. Try again or use email.",
  oauth_state: "Sign-in session expired. Please try again.",
  email_unverified: "Your email is not verified with the provider.",
  no_database: "Full-stack auth needs DATABASE_URL. Use Explore demo instead.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/past";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<Provider | null>(null);
  const [providers, setProviders] = useState({ google: false, microsoft: false, database: false });

  const busy = loading || providerLoading !== null;

  useEffect(() => {
    const err = params.get("error");
    if (err && OAUTH_ERRORS[err]) setError(OAUTH_ERRORS[err]);
    void fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d) =>
        setProviders({
          google: !!d.google,
          microsoft: !!d.microsoft,
          database: !!d.database,
        })
      )
      .catch(() => undefined);
  }, [params]);

  function providerSignIn(provider: Provider) {
    if (busy) return;
    setError(null);
    setProviderLoading(provider);
    const q = new URLSearchParams({ next });
    window.location.assign(`/api/auth/oauth/${provider}/start?${q.toString()}`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.status === 503) {
        // Demo mode (no DATABASE_URL): keep the flow moving instead of dead-ending.
        router.push(next);
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
        {/* Left: sign-in card */}
        <div className="card rise-in p-7">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to FORE</h1>
          <p className="muted mt-1 text-sm">Sign in to see your money, clearly.</p>

          <div className="mt-6 grid gap-2.5">
            {providers.google && (
              <button
                type="button"
                className="btn-provider"
                disabled={busy}
                onClick={() => providerSignIn("google")}
              >
                {providerLoading === "google" ? (
                  <span
                    className="spinner"
                    style={{ borderColor: "rgba(36,28,22,.25)", borderTopColor: "var(--text)" }}
                  />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
            )}
            {/* Microsoft is optional — only shown when MS_CLIENT_ID/SECRET are set */}
            {providers.microsoft && (
              <button
                type="button"
                className="btn-provider"
                disabled={busy}
                onClick={() => providerSignIn("microsoft")}
              >
                {providerLoading === "microsoft" ? (
                  <span
                    className="spinner"
                    style={{ borderColor: "rgba(36,28,22,.25)", borderTopColor: "var(--text)" }}
                  />
                ) : (
                  <MicrosoftIcon />
                )}
                Continue with Microsoft
              </button>
            )}
            <button
              type="button"
              className="btn-provider"
              disabled={busy}
              onClick={() => router.push("/past")}
            >
              Explore with demo data
            </button>
          </div>

          <div className="auth-divider my-5">or with email</div>

          <form className="grid gap-3.5" onSubmit={onSubmit}>
            <label className="grid gap-1">
              <span className="muted text-xs font-semibold">Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1">
              <span className="muted text-xs font-semibold">Password</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="text-sm" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
            <button className="btn btn-shine mt-1" type="submit" disabled={busy}>
              {loading ? (
                <>
                  <span className="spinner" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="muted mt-5 text-center text-sm">
            No account?{" "}
            <Link href="/register" className="underline">
              Register
            </Link>{" "}
            ·{" "}
            <Link href="/docs/security" className="underline">
              Security docs
            </Link>
          </p>
        </div>

        {/* Right: product story */}
        <aside className="feature-panel rise-in" style={{ animationDelay: "80ms" }}>
          <p className="text-3xl font-bold tracking-[0.12em]">
            F<span style={{ color: "var(--accent)" }}>O</span>RE
          </p>
          <p className="muted mt-2 max-w-md text-sm leading-relaxed">
            One platform, three linked faces on a shared data spine. Bring your
            transactions — get your past decoded, your decisions grounded, and your
            goals paced.
          </p>

          <div className="mt-6 grid gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="rise-in flex gap-3.5"
                style={{ animationDelay: `${140 + i * 60}ms` }}
              >
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="muted mt-0.5 max-w-md text-sm leading-relaxed">{f.blurb}</p>
                </div>
              </div>
            ))}
          </div>

          <span className="pill mt-7">CSV in → clarity out · no bank linking required</span>
        </aside>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
