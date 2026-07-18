// FORE — app/(faces)/ahead/page.tsx
// Owner: TASK-006 (Drashti). Goal pace calculator + static peer-benchmark panel.
// Both panels read the live financial_context provider, so they re-render on every
// DECIDE verdict — never a stale pace display.

import GoalPanel from "@/components/GoalPanel";
import BenchmarkPanel from "@/components/BenchmarkPanel";

export default function AheadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AHEAD</h1>
        <p className="mt-1 text-sm text-slate-400">
          Where your money is going — goal pace and how you compare to peers.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <GoalPanel />
        <BenchmarkPanel />
      </div>
    </div>
  );
}
