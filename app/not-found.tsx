import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md rise-in">
        <div className="state-illustration" aria-hidden />
        <h1 className="display text-3xl">Page not found</h1>
        <p className="muted mt-2">That route doesn&apos;t exist in FORE.</p>
        <Link href="/" className="btn mt-6 inline-flex">
          Back home
        </Link>
      </div>
    </main>
  );
}
