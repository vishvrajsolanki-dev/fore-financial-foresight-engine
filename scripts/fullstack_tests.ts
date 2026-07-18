/** Full-stack integration tests — requires Next on TEST_BASE_URL with DATABASE_URL */

export {};

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";

function mergeCookies(existing: string, setCookie: string | null): string {
  const jar = new Map<string, string>();
  for (const part of existing.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k && v.length) jar.set(k, v.join("="));
  }
  if (setCookie) {
    for (const chunk of setCookie.split(/,(?=[^;]+=)/)) {
      const seg = chunk.split(";")[0].trim();
      const eq = seg.indexOf("=");
      if (eq > 0) jar.set(seg.slice(0, eq), seg.slice(eq + 1));
    }
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function post(path: string, body: unknown, cookies = "") {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookies && { Cookie: cookies }) },
    body: JSON.stringify(body),
  });
  return { res, data: await res.json(), setCookie: res.headers.get("set-cookie") };
}

async function main() {
  const email = `test-${Date.now()}@fore.dev`;
  let cookies = "";

  const reg = await post("/api/auth/register", {
    email,
    password: "SecurePass123!",
    demoPersonaId: "persona-rahul",
  });
  if (!reg.res.ok) throw new Error(`register: ${JSON.stringify(reg.data)}`);
  cookies = mergeCookies(cookies, reg.setCookie);
  console.log("  register OK");

  const me = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookies } });
  const meData = await me.json();
  if (!meData.authenticated || !meData.context?.archetype?.label) {
    throw new Error(`me: ${JSON.stringify(meData)}`);
  }
  console.log("  auth/me + context OK");

  const csv = `Date,Narration,Debit Amount,Credit Amount,Balance
01/06/2026,SWIGGY,600.00,,50000
02/06/2026,SALARY,,70000,119400`;
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "icici.csv");
  form.append("monthlyIncome", "70000");
  form.append("cityTier", "Tier 1");

  const up = await fetch(`${BASE}/api/upload/csv`, {
    method: "POST",
    headers: { Cookie: cookies },
    body: form,
  });
  const upData = await up.json();
  if (!up.ok || !upData.context?.burn_rate) throw new Error(`upload: ${JSON.stringify(upData)}`);
  cookies = mergeCookies(cookies, up.headers.get("set-cookie"));
  console.log(`  csv upload OK (${upData.meta.rowCount} rows)`);

  const decide = await post(
    "/api/decide",
    {
      message: "Can I afford a ₹15000 laptop?",
      transactions: upData.context.transactions,
      financial_context: {
        persona: upData.context.persona,
        monthly_income: upData.context.monthly_income,
        archetype: upData.context.archetype,
        burn_rate: upData.context.burn_rate,
        goal: null,
        benchmark: upData.context.benchmark,
        last_decide_verdict: null,
      },
    },
    cookies
  );
  if (!decide.data.tool_called) throw new Error(`decide: ${JSON.stringify(decide.data)}`);
  console.log("  decide tool-call OK");

  const patch = await fetch(`${BASE}/api/context`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({
      goal: { target_amount: 80000, target_date: "2027-06-01", on_pace: false, pace_gap_days: 14 },
      last_decide_verdict: decide.data.verdict,
    }),
  });
  const patchData = await patch.json();
  if (!patch.ok || !patchData.context?.goal) throw new Error(`patch: ${JSON.stringify(patchData)}`);
  console.log("  context persist OK");

  const demo = await post("/api/context/demo", { personaId: "persona-arjun" }, cookies);
  if (!demo.res.ok) throw new Error(`demo persona: ${JSON.stringify(demo.data)}`);
  console.log("  demo persona switch OK");

  const logout = await post("/api/auth/logout", {}, cookies);
  if (!logout.res.ok) throw new Error("logout failed");
  console.log("  logout OK");

  console.log("  All full-stack checks OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
