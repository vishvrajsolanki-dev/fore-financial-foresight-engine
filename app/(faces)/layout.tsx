// FORE — app/(faces)/layout.tsx
// Owner: TASK-002 (Drashti). 3-tab nav shell shared by PAST / DECIDE / AHEAD.
// Consumed by: TASK-006 (shares this layout).

import Link from "next/link";

export default function FacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* TODO(TASK-002): style this nav — Tailwind + shadcn/ui, per docs/CONTRACTS.md stack */}
      <nav>
        <Link href="/past">PAST</Link>
        <Link href="/decide">DECIDE</Link>
        <Link href="/ahead">AHEAD</Link>
      </nav>
      <main>{children}</main>
      {/* TODO(TASK-010): visible "not licensed financial advice" disclaimer, every face */}
    </div>
  );
}
