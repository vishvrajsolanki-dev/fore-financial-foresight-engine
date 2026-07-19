"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md rise-in">
        <div className="state-illustration" aria-hidden />
        <h1 className="display text-3xl">Something went wrong</h1>
        <p className="muted mt-2">An unexpected error occurred.</p>
        <button className="btn mt-6" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
