"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { PERSONAS } from "@/lib/data/personas";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoPersonaId, setDemoPersonaId] = useState(PERSONAS[0]?.session_id ?? "");
  const [useDemo, setUseDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          demoPersonaId: useDemo ? demoPersonaId : undefined,
          monthlyIncome: useDemo ? undefined : 60000,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error) || "Registration failed";
        throw new Error(msg);
      }
      router.push("/past");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Create your FORE account</h1>
      <p className="muted mt-2 text-sm">
        Full-stack mode: JWT auth, PostgreSQL persistence, optional real bank CSV import. Passwords
        are bcrypt-hashed; financial data never goes inside JWT tokens.
      </p>

      <form className="card mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="muted text-xs">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="muted text-xs">Password (min 8 characters)</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useDemo} onChange={(e) => setUseDemo(e.target.checked)} />
          Start with a demo persona (recommended for first login)
        </label>

        {useDemo && (
          <label className="grid gap-1">
            <span className="muted text-xs">Demo persona</span>
            <select
              className="input"
              value={demoPersonaId}
              onChange={(e) => setDemoPersonaId(e.target.value)}
            >
              {PERSONAS.map((p) => (
                <option key={p.session_id} value={p.session_id}>
                  {p.persona}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="muted mt-4 text-center text-sm">
        Already registered?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
