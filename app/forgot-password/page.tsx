"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "If that email exists, a reset link has been issued.");
      if (data.devResetLink) setDevLink(data.devResetLink);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      footer={
        <Link href="/login" style={{ color: "var(--accent)" }}>
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          Email
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button className="btn w-full" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      {message && <p className="text-sm mt-3 muted">{message}</p>}
      {devLink && (
        <p className="text-sm mt-2">
          Dev link:{" "}
          <a href={devLink} style={{ color: "var(--accent)" }}>
            Reset password
          </a>
        </p>
      )}
    </AuthShell>
  );
}
