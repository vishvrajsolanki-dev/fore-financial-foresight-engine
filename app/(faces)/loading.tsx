// FORE — app/(faces)/loading.tsx
// Owner: TASK-009. Route-transition loading skeleton for the three faces.
// TASK-010: matches face card rhythm used by PAST / DECIDE / AHEAD.

export default function Loading() {
  return (
    <div className="grid gap-4">
      <div className="card animate-pulse">
        <div className="h-4 w-20 rounded" style={{ background: "var(--bg-soft)" }} />
        <div className="mt-3 h-6 w-64 max-w-full rounded" style={{ background: "var(--bg-soft)" }} />
        <div className="mt-2 h-4 w-80 max-w-full rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
      <div className="card animate-pulse">
        <div className="h-40 rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
    </div>
  );
}
