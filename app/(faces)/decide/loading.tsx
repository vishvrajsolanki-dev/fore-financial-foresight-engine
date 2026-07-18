// FORE — app/(faces)/decide/loading.tsx
// Owner: TASK-009. DECIDE route loading skeleton.

export default function Loading() {
  return (
    <div className="grid gap-4">
      <div className="card animate-pulse">
        <div className="h-4 w-20 rounded" style={{ background: "var(--bg-soft)" }} />
        <div className="mt-3 h-6 w-72 max-w-full rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
      <div className="card animate-pulse min-h-[16rem]">
        <div className="h-24 rounded" style={{ background: "var(--bg-soft)" }} />
      </div>
    </div>
  );
}
