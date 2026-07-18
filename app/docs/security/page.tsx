import Link from "next/link";

export default function SecurityDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose prose-invert">
      <h1>FORE — Data Protection for Real Bank Data</h1>
      <p>
        See the full document in the repository:{" "}
        <code>docs/SECURITY.md</code>
      </p>
      <ul>
        <li>JWT access tokens (15 min) + revocable refresh tokens (7 days) in httpOnly cookies</li>
        <li>Passwords hashed with bcrypt (12 rounds)</li>
        <li>Transaction descriptions encrypted at rest (AES-256-GCM)</li>
        <li>Raw CSV files are never persisted — parsed and discarded in memory</li>
        <li>All queries scoped by authenticated user ID</li>
        <li>No financial data inside JWT payload (user ID + session ID only)</li>
      </ul>
      <Link href="/past">← Back to FORE</Link>
    </div>
  );
}
