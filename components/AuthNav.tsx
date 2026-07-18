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
      <Link href="/login" className="btn text-xs px-3 py-1.5">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="muted hidden lg:inline text-xs truncate max-w-[10rem]">{authUser.email}</span>
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
