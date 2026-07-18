// FORE — app/(faces)/past/loading.tsx
// Owner: TASK-009. PAST route loading skeleton.

export default function Loading() {
  return (
    <div className="card animate-pulse">
      <div className="h-6 w-48 rounded" style={{ background: "var(--bg-soft)" }} />
      <div className="mt-4 h-72 rounded" style={{ background: "var(--bg-soft)" }} />
    </div>
  );
}
