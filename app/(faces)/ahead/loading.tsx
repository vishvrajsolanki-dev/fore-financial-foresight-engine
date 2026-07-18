// FORE — app/(faces)/ahead/loading.tsx
// Owner: TASK-009. AHEAD route loading skeleton.

export default function Loading() {
  return (
    <div className="grid gap-4">
      <div className="card animate-pulse">
        <div className="h-6 w-40 rounded" style={{ background: "var(--bg-soft)" }} />
        <div className="mt-4 h-20 rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
      <div className="card animate-pulse">
        <div className="h-6 w-36 rounded" style={{ background: "var(--bg-soft)" }} />
        <div className="mt-4 h-32 rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
    </div>
  );
}
