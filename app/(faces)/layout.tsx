// FORE — app/(faces)/layout.tsx
// Owner: TASK-002 (Drashti). 3-tab nav shell shared by PAST / DECIDE / AHEAD.
// Consumed by: TASK-006 (shares this layout).

import ShellNav from "@/components/ShellNav";
import { FinancialContextProvider } from "@/lib/context/financialContext";

export default function FacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinancialContextProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <ShellNav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6">
          <p className="border-t border-slate-800 pt-4 text-xs text-slate-500">
            FORE is a hackathon demo. Not licensed financial advice.
          </p>
        </footer>
      </div>
    </FinancialContextProvider>
  );
}
