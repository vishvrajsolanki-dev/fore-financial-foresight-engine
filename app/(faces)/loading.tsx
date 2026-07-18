// FORE — app/(faces)/loading.tsx
// Owner: TASK-009. Route-transition loading skeleton for the three faces.

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="card animate-pulse">
        <div className="h-6 w-40 rounded" style={{ background: "var(--bg-soft)" }} />
        <div className="mt-4 h-40 rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
    </div>
  );
}
