import { decryptField, encryptField } from "@/lib/security/encryption";
import { computeBenchmark } from "@/lib/benchmark/computeBenchmark";
import { callMl } from "@/lib/api/mlServer";
import { prisma } from "@/lib/db/prisma";
import type { ArchetypeLabel, FinancialContext, Transaction } from "@/types/financialContext";

function txToDb(
  t: Transaction & { confidence?: number; source?: string; fingerprint?: string; statementId?: string }
) {
  return {
    date: t.date,
    category: t.category,
    amount: t.amount,
    descriptionEnc: t.description ? encryptField(t.description) : null,
    merchant: t.merchant ?? null,
    confidence: t.confidence ?? null,
    source: t.source ?? null,
    fingerprint: t.fingerprint ?? null,
    statementId: t.statementId ?? null,
  };
}

function txFromDb(
  row: {
    id?: string;
    date: string;
    category: string;
    amount: number;
    descriptionEnc: string | null;
    merchant?: string | null;
    confidence?: number | null;
    source?: string | null;
  },
  opts: { decryptDescriptions: boolean }
): Transaction {
  return {
    ...(row.id ? { id: row.id } : {}),
    date: row.date,
    category: row.category,
    amount: row.amount,
    merchant: row.merchant ?? undefined,
    confidence: row.confidence ?? undefined,
    source: row.source ?? undefined,
    description:
      opts.decryptDescriptions && row.descriptionEnc
        ? decryptField(row.descriptionEnc)
        : undefined,
  };
}

export type SessionToContextOpts = {
  userId?: string;
  /** When false, skip AES decrypt — enough for classify/burn/decide spine. Default false for perf. */
  decryptDescriptions?: boolean;
  /** Cap transactions returned (newest-first then re-sorted). */
  transactionLimit?: number;
};

export async function sessionToContext(
  sessionId: string,
  userIdOrOpts?: string | SessionToContextOpts
): Promise<FinancialContext | null> {
  const opts: SessionToContextOpts =
    typeof userIdOrOpts === "string" ? { userId: userIdOrOpts } : userIdOrOpts ?? {};
  const decryptDescriptions = opts.decryptDescriptions === true;
  const limit = opts.transactionLimit;

  const session = opts.userId
    ? await prisma.financialSession.findFirst({
        where: { id: sessionId, userId: opts.userId },
        include: {
          transactions: {
            orderBy: { date: "asc" },
            ...(limit ? { take: limit } : {}),
          },
        },
      })
    : await prisma.financialSession.findUnique({
        where: { id: sessionId },
        include: {
          transactions: {
            orderBy: { date: "asc" },
            ...(limit ? { take: limit } : {}),
          },
        },
      });
  if (!session) return null;

  const transactions = session.transactions.map((row) =>
    txFromDb(row, { decryptDescriptions })
  );

  return {
    session_id: session.id,
    persona: session.persona ?? "Your data",
    monthly_income: session.monthlyIncome,
    archetype: session.archetypeLabel
      ? {
          label: session.archetypeLabel as ArchetypeLabel,
          distances: (session.archetypeDistances as Record<string, number>) ?? {},
        }
      : null,
    burn_rate: session.burnRate as FinancialContext["burn_rate"],
    transactions,
    goal: session.goal as FinancialContext["goal"],
    last_decide_verdict: session.lastDecideVerdict as FinancialContext["last_decide_verdict"],
    benchmark: session.benchmark as FinancialContext["benchmark"],
  };
}

/** Spine for LLM prompts — no transaction rows, no decrypted narrations. */
export async function sessionToSpine(sessionId: string, userId: string) {
  const session = await prisma.financialSession.findFirst({
    where: { id: sessionId, userId, isActive: true },
  });
  if (!session) return null;
  return {
    session_id: session.id,
    persona: session.persona ?? "Your data",
    monthly_income: session.monthlyIncome,
    income_bracket: session.incomeBracket,
    city_tier: session.cityTier,
    archetype: session.archetypeLabel
      ? {
          label: session.archetypeLabel as ArchetypeLabel,
          distances: (session.archetypeDistances as Record<string, number>) ?? {},
        }
      : null,
    burn_rate: session.burnRate as FinancialContext["burn_rate"],
    goal: session.goal as FinancialContext["goal"],
    last_decide_verdict: session.lastDecideVerdict as FinancialContext["last_decide_verdict"],
    benchmark: session.benchmark as FinancialContext["benchmark"],
  };
}

export async function listTransactionsPage(opts: {
  sessionId: string;
  userId: string;
  cursor?: string;
  limit?: number;
  decryptDescriptions?: boolean;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const rows = await prisma.transaction.findMany({
    where: {
      sessionId: opts.sessionId,
      session: { userId: opts.userId },
      ...(opts.cursor ? { id: { lt: opts.cursor } } : {}),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      date: true,
      category: true,
      amount: true,
      descriptionEnc: true,
      merchant: true,
      confidence: true,
      source: true,
    },
  });
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]?.id : null;
  return {
    transactions: page.map((r) =>
      txFromDb(r, { decryptDescriptions: opts.decryptDescriptions === true })
    ),
    nextCursor,
  };
}

async function getPastDataServer(transactions: Transaction[], monthlyIncome: number) {
  const [classifyRes, burnRes] = await Promise.all([
    callMl<{ label: ArchetypeLabel; distances: Record<string, number> }>("/classify", {
      transactions,
      monthly_income: monthlyIncome,
    }),
    callMl<NonNullable<FinancialContext["burn_rate"]>>("/burn-rate", { transactions }),
  ]);
  if (!classifyRes.ok) throw new Error(classifyRes.error);
  if (!burnRes.ok) throw new Error(burnRes.error);
  return {
    archetype: { label: classifyRes.data.label, distances: classifyRes.data.distances },
    burn_rate: burnRes.data,
  };
}

export async function computeAndPersistPast(
  sessionId: string,
  transactions: Transaction[],
  monthlyIncome: number,
  incomeBracket: string,
  cityTier: string
) {
  const past = await getPastDataServer(transactions, monthlyIncome);
  if (!past.archetype || !past.burn_rate) {
    throw new Error("PAST computation failed — archetype or burn rate missing");
  }
  const benchmark = computeBenchmark(transactions, incomeBracket, cityTier);

  await prisma.financialSession.update({
    where: { id: sessionId },
    data: {
      // Persona label = assigned archetype (RupeeIQ model — never user-selected).
      persona: `Assigned: ${past.archetype.label}`,
      archetypeLabel: past.archetype.label,
      archetypeDistances: past.archetype.distances,
      burnRate: past.burn_rate,
      benchmark: benchmark ?? undefined,
    },
  });

  return { past, benchmark };
}

export async function appendTransactionsToSession(opts: {
  sessionId: string;
  userId: string;
  transactions: (Transaction & {
    confidence?: number;
    source?: string;
    fingerprint?: string;
    statementId?: string;
  })[];
  fileName: string;
  rowCount: number;
}) {
  const session = await prisma.financialSession.findFirst({
    where: { id: opts.sessionId, userId: opts.userId, isActive: true },
  });
  if (!session) throw new Error("Active session not found");

  const upload = await prisma.statementUpload.create({
    data: {
      sessionId: opts.sessionId,
      userId: opts.userId,
      fileName: opts.fileName,
      rowCount: opts.rowCount,
    },
  });

  if (opts.transactions.length) {
    await prisma.transaction.createMany({
      data: opts.transactions.map((t) => ({
        ...txToDb({ ...t, statementId: upload.id }),
        sessionId: opts.sessionId,
      })),
    });
  }

  const allRows = await prisma.transaction.findMany({
    where: { sessionId: opts.sessionId },
    orderBy: { date: "asc" },
    select: {
      date: true,
      category: true,
      amount: true,
      merchant: true,
      descriptionEnc: true,
    },
  });
  const allTxns = allRows.map((r) => txFromDb(r, { decryptDescriptions: true }));

  await computeAndPersistPast(
    opts.sessionId,
    allTxns,
    session.monthlyIncome,
    session.incomeBracket,
    session.cityTier
  );

  const consent = await prisma.userConsent.findUnique({ where: { userId: opts.userId } });
  if (consent?.benchmarkOptInAt) {
    const { contributeBenchmarkAggregate } = await import("@/lib/benchmark/aggregate");
    await contributeBenchmarkAggregate({
      incomeBracket: session.incomeBracket,
      cityTier: session.cityTier,
      transactions: allTxns,
    });
  }

  return upload.id;
}

export async function loadExistingFingerprints(userId: string): Promise<Set<string>> {
  const rows = await prisma.transaction.findMany({
    where: { session: { userId }, fingerprint: { not: null } },
    select: { fingerprint: true },
  });
  return new Set(rows.map((r) => r.fingerprint!).filter(Boolean));
}

export async function loadUserCategoryRules(userId: string) {
  return prisma.categoryRule.findMany({ where: { userId } });
}

export async function createSessionFromTransactions(opts: {
  userId: string;
  transactions: Transaction[];
  monthlyIncome: number;
  incomeBracket: string;
  cityTier: string;
  dataSource: "demo" | "csv";
  persona?: string;
  csvFileName?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.financialSession.updateMany({
      where: { userId: opts.userId, isActive: true },
      data: { isActive: false },
    });

    const session = await tx.financialSession.create({
      data: {
        userId: opts.userId,
        persona: opts.persona ?? null,
        monthlyIncome: opts.monthlyIncome,
        incomeBracket: opts.incomeBracket,
        cityTier: opts.cityTier,
        dataSource: opts.dataSource,
        csvFileName: opts.csvFileName ?? null,
        isActive: true,
        transactions: {
          create: opts.transactions.map(txToDb),
        },
      },
    });

    return session.id;
  }).then(async (sessionId) => {
    if (opts.transactions.length > 0) {
      try {
        await computeAndPersistPast(
          sessionId,
          opts.transactions,
          opts.monthlyIncome,
          opts.incomeBracket,
          opts.cityTier
        );
        const consent = await prisma.userConsent.findUnique({ where: { userId: opts.userId } });
        if (consent?.benchmarkOptInAt) {
          const { contributeBenchmarkAggregate } = await import("@/lib/benchmark/aggregate");
          await contributeBenchmarkAggregate({
            incomeBracket: opts.incomeBracket,
            cityTier: opts.cityTier,
            transactions: opts.transactions,
          });
        }
      } catch (err) {
        // Roll back active flag if analytics fail — leave session inactive.
        await prisma.financialSession.update({
          where: { id: sessionId },
          data: { isActive: false },
        });
        throw err;
      }
    }
    return sessionId;
  });
}

export async function patchSessionContext(
  sessionId: string,
  userId: string,
  patch: Partial<{
    goal: FinancialContext["goal"];
    lastDecideVerdict: FinancialContext["last_decide_verdict"];
    burnRate: FinancialContext["burn_rate"];
  }>
) {
  const session = await prisma.financialSession.findFirst({
    where: { id: sessionId, userId, isActive: true },
  });
  if (!session) return false;

  await prisma.financialSession.update({
    where: { id: sessionId },
    data: {
      ...(patch.goal !== undefined && { goal: patch.goal ?? undefined }),
      ...(patch.lastDecideVerdict !== undefined && {
        lastDecideVerdict: patch.lastDecideVerdict ?? undefined,
      }),
      ...(patch.burnRate !== undefined && { burnRate: patch.burnRate ?? undefined }),
    },
  });
  return true;
}

/** Load signed transactions for tool math without decrypting descriptions. */
export async function loadSessionTransactions(
  sessionId: string,
  userId: string
): Promise<Transaction[]> {
  const rows = await prisma.transaction.findMany({
    where: { sessionId, session: { userId } },
    orderBy: { date: "asc" },
    select: { date: true, category: true, amount: true, merchant: true },
  });
  return rows.map((r) => ({
    date: r.date,
    category: r.category,
    amount: r.amount,
    merchant: r.merchant ?? undefined,
  }));
}
