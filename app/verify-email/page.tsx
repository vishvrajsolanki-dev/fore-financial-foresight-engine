"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"pending" | "ok" | "err">("pending");
  const [message, setMessage] = useState("Verifying…");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Missing verification token.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");
        setStatus("ok");
        setMessage("Email verified. You can continue.");
      })
      .catch((e) => {
        setStatus("err");
        setMessage(e instanceof Error ? e.message : "Verification failed");
      });
  }, [token]);

  return (
    <AuthShell
      title="Email verification"
      footer={
        <Link href="/past" style={{ color: "var(--accent)" }}>
          Go to Past
        </Link>
      }
    >
      <div className="state-illustration" aria-hidden />
      <p className={status === "err" ? "" : "muted"} style={status === "err" ? { color: "var(--danger)" } : undefined}>
        {message}
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShell title="Email verification"><p className="muted">Loading…</p></AuthShell>}>
      <VerifyInner />
    </Suspense>
  );
}
