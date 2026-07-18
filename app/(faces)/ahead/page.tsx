// FORE — app/(faces)/ahead/page.tsx
// Owner: TASK-006 (Drashti). Goal pace calculator + static peer-benchmark panel.
// Re-reads financial_context after every DECIDE verdict via the shared context provider.
// TASK-010: shared face intro for visual consistency with PAST / DECIDE.

import FaceIntro from "@/components/FaceIntro";
import GoalPanel from "@/components/GoalPanel";
import BenchmarkPanel from "@/components/BenchmarkPanel";

export default function AheadPage() {
  return (
    <div className="grid gap-4">
      <FaceIntro
        face="AHEAD"
        title="Where your money is going"
        blurb="Goal pace and peer benchmarks — same live financial context DECIDE just updated."
      />
      <GoalPanel />
      <BenchmarkPanel />
    </div>
  );
}
