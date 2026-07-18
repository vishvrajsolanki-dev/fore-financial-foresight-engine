import type { FinancialContext } from "@/types/financialContext";

export function exportAheadSummaryPng(ctx: FinancialContext, personaLabel: string): void {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 480;
  const g = canvas.getContext("2d");
  if (!g) return;

  g.fillStyle = "#0b1020";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#e8ecf7";
  g.font = "bold 28px system-ui";
  g.fillText("FORE — AHEAD Summary", 32, 48);
  g.font = "16px system-ui";
  g.fillStyle = "#9aa6c4";
  g.fillText(`${personaLabel} · ${new Date().toLocaleDateString()}`, 32, 80);

  let y = 120;
  const line = (label: string, value: string) => {
    g.fillStyle = "#9aa6c4";
    g.fillText(label, 32, y);
    g.fillStyle = "#e8ecf7";
    g.font = "bold 18px system-ui";
    g.fillText(value, 32, y + 24);
    g.font = "16px system-ui";
    y += 56;
  };

  if (ctx.archetype) line("Archetype", ctx.archetype.label);
  if (ctx.burn_rate) {
    line("Daily burn", `₹${Math.round(ctx.burn_rate.daily_avg).toLocaleString("en-IN")}/day`);
    line("Zero-balance date", ctx.burn_rate.projected_zero_balance_date);
  }
  if (ctx.goal) {
    line(
      "Goal pace",
      ctx.goal.on_pace ? "On pace ✓" : `Behind by ${ctx.goal.pace_gap_days ?? "?"} days`
    );
  }
  if (ctx.last_decide_verdict) {
    line(
      "Last DECIDE",
      `${ctx.last_decide_verdict.item} — shift ${ctx.last_decide_verdict.day_shift} days`
    );
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fore-ahead-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
