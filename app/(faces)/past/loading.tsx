// FORE — app/(faces)/past/loading.tsx
// Owner: TASK-009. PAST route loading skeleton.

export default function Loading() {
  return (
    <div className="grid gap-4">
      <div className="card animate-pulse">
        <div className="h-4 w-16 rounded" style={{ background: "var(--bg-soft)" }} />
        <div className="mt-3 h-6 w-56 max-w-full rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
      <div className="card animate-pulse">
        <div className="h-72 rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
    </div>
  );
}
