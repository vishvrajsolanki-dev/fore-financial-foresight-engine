"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("60000");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const income = Number(monthlyIncome);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          monthlyIncome: Number.isFinite(income) && income > 0 ? income : 60000,
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
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <div className="card rise-in p-7">
        <p className="fore-brand text-2xl">
          F<span style={{ color: "var(--accent)" }}>O</span>RE
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="muted mt-1 text-sm">
          After you upload a bank CSV on PAST, FORE assigns your spending archetype from the data
          (nearest of 5 centroids) — you never pick a personality.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
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
            <span className="muted text-xs font-semibold">Password (min 8 characters)</span>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="muted text-xs font-semibold">Monthly income (₹) — for ratios</span>
            <input
              className="input"
              type="number"
              min={1}
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              required
            />
          </label>

          {error && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <button className="btn btn-shine mt-1" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="muted mt-5 text-center text-sm">
          Already registered?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
