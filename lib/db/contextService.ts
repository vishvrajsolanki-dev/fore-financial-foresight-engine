import { decryptField, encryptField } from "@/lib/security/encryption";
import { computeBenchmark } from "@/lib/benchmark/computeBenchmark";
import { getPastData } from "@/lib/api/pastClient";
import { prisma } from "@/lib/db/prisma";
import type { ArchetypeLabel, FinancialContext, Transaction } from "@/types/financialContext";

function txToDb(t: Transaction) {
  return {
    date: t.date,
    category: t.category,
    amount: t.amount,
    descriptionEnc: t.description ? encryptField(t.description) : null,
  };
}

function txFromDb(row: {
  date: string;
  category: string;
  amount: number;
  descriptionEnc: string | null;
}): Transaction {
  return {
    date: row.date,
    category: row.category,
    amount: row.amount,
    description: row.descriptionEnc ? decryptField(row.descriptionEnc) : undefined,
  };
}

export async function sessionToContext(sessionId: string): Promise<FinancialContext | null> {
  const session = await prisma.financialSession.findUnique({
    where: { id: sessionId },
    include: { transactions: { orderBy: { date: "asc" } } },
  });
  if (!session) return null;

  const transactions = session.transactions.map(txFromDb);

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

export async function computeAndPersistPast(
  sessionId: string,
  transactions: Transaction[],
  monthlyIncome: number,
  incomeBracket: string,
  cityTier: string
) {
  const past = await getPastData(transactions, monthlyIncome);
  if (!past.archetype || !past.burn_rate) {
    throw new Error("PAST computation failed — archetype or burn rate missing");
  }
  const benchmark = computeBenchmark(transactions, incomeBracket, cityTier);

  await prisma.financialSession.update({
    where: { id: sessionId },
    data: {
      archetypeLabel: past.archetype.label,
      archetypeDistances: past.archetype.distances,
      burnRate: past.burn_rate,
      benchmark: benchmark ?? undefined,
    },
  });

  return { past, benchmark };
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
  await prisma.financialSession.updateMany({
    where: { userId: opts.userId, isActive: true },
    data: { isActive: false },
  });

  const session = await prisma.financialSession.create({
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

  if (opts.transactions.length > 0) {
    await computeAndPersistPast(
      session.id,
      opts.transactions,
      opts.monthlyIncome,
      opts.incomeBracket,
      opts.cityTier
    );
  }

  return session.id;
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
