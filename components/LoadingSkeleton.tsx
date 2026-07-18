export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg"
          style={{
            background: "var(--bg-soft)",
            width: i === 0 ? "40%" : i === lines - 1 ? "60%" : "85%",
          }}
        />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-48 rounded-xl" style={{ background: "var(--bg-soft)" }} />
    </div>
  );
}
