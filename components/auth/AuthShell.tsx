import Link from "next/link";

export default function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-a3">
      <Link href="/" className="fore-brand text-2xl absolute top-8 left-8 text-white">
        F<span style={{ color: "var(--accent)" }}>O</span>RE
      </Link>
      <div className="auth-a3-panel rise-in">
        <h1 className="display text-2xl mb-1">{title}</h1>
        <p className="muted text-sm mb-5">See your financial future clearly</p>
        {children}
        {footer ? <div className="mt-5 text-sm muted">{footer}</div> : null}
      </div>
    </div>
  );
}
