// FORE — app/(faces)/ahead/page.tsx
// Owner: TASK-006 (Drashti). Goal pace calculator + static peer-benchmark panel.
// Must re-read financial_context after every DECIDE verdict, not just on initial load.

import GoalPanel from "@/components/GoalPanel";
import BenchmarkPanel from "@/components/BenchmarkPanel";

export default function AheadPage() {
  return (
    <div>
      <GoalPanel />
      <BenchmarkPanel />
    </div>
  );
}
