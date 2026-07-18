// FORE — app/error.tsx
// Owner: TASK-009 (Allen + Kavya). Global error boundary — a handled, non-crashing state on stage
// beats a blank screen or an unhandled exception (CONTRACT-006 hardening).

"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="card">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="muted mt-2">{error.message || "An unexpected error occurred."}</p>
        <button className="btn mt-4" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
