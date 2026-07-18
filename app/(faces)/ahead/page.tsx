// FORE — app/(faces)/ahead/page.tsx
// Owner: TASK-006 (Drashti). Goal pace calculator + static peer-benchmark panel.
// Re-reads financial_context after every DECIDE verdict via the shared context provider.

import GoalPanel from "@/components/GoalPanel";
import BenchmarkPanel from "@/components/BenchmarkPanel";

export default function AheadPage() {
  return (
    <div className="grid gap-4">
      <GoalPanel />
      <BenchmarkPanel />
    </div>
  );
}
