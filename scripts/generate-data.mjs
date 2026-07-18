// FORE — scripts/generate-data.mjs
// Generates the static synthetic data (data/personas/*.json + data/benchmark.json) ONCE.
// Deterministic (seeded PRNG) so re-running produces identical output. The JSON is checked in;
// nothing is ever generated at runtime during the demo (TASK-004 constraint / CONTRACT-005).
//
// Run: node scripts/generate-data.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- deterministic PRNG (mulberry32) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- date helpers (90-day window ending just before the demo day) ----------
const WINDOW_END = new Date("2026-07-15T00:00:00Z");
const WINDOW_DAYS = 90;

function isoDay(offsetFromStart) {
  const d = new Date(WINDOW_END);
  d.setUTCDate(d.getUTCDate() - (WINDOW_DAYS - 1 - offsetFromStart));
  return d.toISOString().slice(0, 10);
}

// ---------- persona generation ----------
// Three visibly distinct spending patterns (TASK-004: "not uniform random" — distinctness is what
// makes TASK-003's classification meaningful).

function genPersona({ seed, persona, displayName, monthlyIncome, incomeBracket, cityTier, plan }) {
  const rand = mulberry32(seed);
  const between = (lo, hi) => lo + rand() * (hi - lo);
  const roundTo = (v, step) => Math.round(v / step) * step;
  const transactions = [];

  for (let day = 0; day < WINDOW_DAYS; day++) {
    const date = isoDay(day);
    const dayOfMonth = Number(date.slice(8, 10));

    // Fixed monthly bills on set days of the month.
    for (const bill of plan.monthly) {
      if (dayOfMonth === bill.day) {
        transactions.push({
          date,
          category: bill.category,
          amount: roundTo(between(bill.amount * 0.97, bill.amount * 1.03), 10),
          description: bill.description,
        });
      }
    }

    // Probabilistic daily spends per category.
    for (const c of plan.daily) {
      if (rand() < c.chance) {
        transactions.push({
          date,
          category: c.category,
          amount: roundTo(between(c.min, c.max), 5),
          description: c.descriptions[Math.floor(rand() * c.descriptions.length)],
        });
        // Occasional same-day double spend for "spiky" personas.
        if (c.doubleChance && rand() < c.doubleChance) {
          transactions.push({
            date,
            category: c.category,
            amount: roundTo(between(c.min, c.max), 5),
            description: c.descriptions[Math.floor(rand() * c.descriptions.length)],
          });
        }
      }
    }
  }

  transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return {
    persona,
    display_name: displayName,
    monthly_income: monthlyIncome,
    income_bracket: incomeBracket,
    city_tier: cityTier,
    transactions,
  };
}

const personas = [
  genPersona({
    seed: 20260415,
    persona: "arjun",
    displayName: "Arjun — steady salaried engineer",
    monthlyIncome: 90000,
    incomeBracket: "60k-100k",
    cityTier: "tier-1",
    plan: {
      monthly: [
        { day: 1, category: "rent", amount: 22000, description: "Monthly rent" },
        { day: 5, category: "utilities", amount: 2600, description: "Electricity + internet" },
      ],
      daily: [
        { category: "groceries", chance: 0.42, min: 450, max: 950, descriptions: ["BigBasket order", "Local kirana", "DMart run"] },
        { category: "transport", chance: 0.62, min: 80, max: 220, descriptions: ["Metro card top-up", "Auto fare", "Office cab share"] },
        { category: "food_dining", chance: 0.14, min: 350, max: 750, descriptions: ["Weekend dinner out", "Team lunch"] },
        { category: "entertainment", chance: 0.05, min: 250, max: 600, descriptions: ["Movie ticket", "OTT subscription"] },
        { category: "shopping", chance: 0.04, min: 600, max: 1800, descriptions: ["Clothing", "Household item"] },
      ],
    },
  }),
  genPersona({
    seed: 20260416,
    persona: "meera",
    displayName: "Meera — the foodie designer",
    monthlyIncome: 55000,
    incomeBracket: "30k-60k",
    cityTier: "tier-2",
    plan: {
      monthly: [
        { day: 2, category: "rent", amount: 13000, description: "Monthly rent" },
        { day: 6, category: "utilities", amount: 1800, description: "Electricity + internet" },
      ],
      daily: [
        { category: "food_dining", chance: 0.85, min: 180, max: 720, doubleChance: 0.3, descriptions: ["Swiggy order", "Cafe brunch", "Street food crawl", "Zomato dinner", "New restaurant try"] },
        { category: "groceries", chance: 0.16, min: 300, max: 700, descriptions: ["Local kirana", "Veggie market"] },
        { category: "transport", chance: 0.32, min: 60, max: 180, descriptions: ["Auto fare", "Bus pass", "Rapido"] },
        { category: "entertainment", chance: 0.07, min: 200, max: 500, descriptions: ["Movie ticket", "Food festival entry"] },
        { category: "shopping", chance: 0.05, min: 400, max: 1500, descriptions: ["Kitchen gadget", "Cookbook"] },
      ],
    },
  }),
  genPersona({
    seed: 20260417,
    persona: "rohan",
    displayName: "Rohan — impulsive gadget lover",
    monthlyIncome: 130000,
    incomeBracket: "100k-200k",
    cityTier: "tier-1",
    plan: {
      monthly: [
        { day: 1, category: "rent", amount: 30000, description: "Monthly rent" },
        { day: 4, category: "utilities", amount: 3200, description: "Electricity + internet" },
      ],
      daily: [
        { category: "shopping", chance: 0.3, min: 500, max: 9000, doubleChance: 0.15, descriptions: ["Amazon impulse buy", "Flipkart sale grab", "Sneaker drop", "Gadget accessory", "Flash-sale checkout"] },
        { category: "entertainment", chance: 0.26, min: 300, max: 1400, descriptions: ["Concert ticket", "Gaming credits", "Club night", "Go-karting"] },
        { category: "food_dining", chance: 0.3, min: 400, max: 1200, descriptions: ["Zomato order", "Brewery night", "Fine dining"] },
        { category: "groceries", chance: 0.12, min: 400, max: 900, descriptions: ["Instamart order", "DMart run"] },
        { category: "transport", chance: 0.36, min: 120, max: 450, descriptions: ["Uber ride", "Fuel top-up"] },
      ],
    },
  }),
];

// ---------- benchmark JSON (CONTRACT-005) ----------
// All 5 income brackets x 3 city tiers, no gaps (TASK-004 edge case). Each element matches the
// CONTRACT-005 object shape exactly; the file is an array covering every combination.

const BRACKETS = [
  { id: "0-30k", mid: 20000 },
  { id: "30k-60k", mid: 45000 },
  { id: "60k-100k", mid: 80000 },
  { id: "100k-200k", mid: 150000 },
  { id: "200k+", mid: 260000 },
];
const TIERS = [
  { id: "tier-1", mult: 1.25 },
  { id: "tier-2", mult: 1.0 },
  { id: "tier-3", mult: 0.8 },
];
// Share of mid-income spent per category at the median, per bracket (spend share falls as income rises).
const CATEGORY_SHARE = {
  food_dining: 0.085,
  groceries: 0.09,
  transport: 0.05,
  entertainment: 0.04,
  shopping: 0.065,
  utilities: 0.045,
};

const benchRand = mulberry32(20260701);
const benchmark = [];
for (const b of BRACKETS) {
  for (const t of TIERS) {
    const categories = Object.entries(CATEGORY_SHARE).map(([category, share]) => {
      const jitter = 0.9 + benchRand() * 0.2;
      const p50 = Math.round((b.mid * share * t.mult * jitter) / 50) * 50;
      return {
        category,
        percentiles: {
          p25: Math.round((p50 * 0.62) / 50) * 50,
          p50,
          p75: Math.round((p50 * 1.45) / 50) * 50,
          p90: Math.round((p50 * 2.1) / 50) * 50,
        },
      };
    });
    benchmark.push({ income_bracket: b.id, city_tier: t.id, categories });
  }
}

// ---------- write files ----------
mkdirSync(join(ROOT, "data", "personas"), { recursive: true });
for (const p of personas) {
  writeFileSync(join(ROOT, "data", "personas", `${p.persona}.json`), JSON.stringify(p, null, 2) + "\n");
  console.log(`data/personas/${p.persona}.json — ${p.transactions.length} transactions`);
}
writeFileSync(join(ROOT, "data", "benchmark.json"), JSON.stringify(benchmark, null, 2) + "\n");
console.log(`data/benchmark.json — ${benchmark.length} bracket/tier combinations`);
