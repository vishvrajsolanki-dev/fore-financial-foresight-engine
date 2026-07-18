"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFinancialContext } from "@/lib/context/FinancialContextProvider";

export default function AuthNav() {
  const { authUser, fullStackEnabled, logout } = useFinancialContext();
  const router = useRouter();

  if (!fullStackEnabled) return null;

  if (!authUser) {
    return (
      <div className="flex gap-2 text-sm">
        <Link href="/login" className="btn-ghost text-xs px-3 py-1.5">
          Log in
        </Link>
        <Link href="/register" className="btn text-xs px-3 py-1.5">
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="muted hidden sm:inline">{authUser.email}</span>
      <button
        type="button"
        className="btn-ghost text-xs px-3 py-1.5"
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
      >
        Log out
      </button>
    </div>
  );
}
