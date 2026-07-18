# FORE — ml-service/burn_rate.py
# Owner: TASK-003 (Vishvraj). CONTRACT-003 in docs/CONTRACTS.md.
# Linear regression, honestly labeled as a straight-line trend — no forecasting-accuracy claim.
# Reused as-is by TASK-007's can_i_afford.py: insert the hypothetical expense into the transaction
# set fed here, do not write a second regression path.
#
# POST /burn-rate
# Input:  { transactions: Transaction[] }
# Output: { daily_avg: number, trend_slope: number, projected_zero_balance_date: string }
#
# Model (locked with TASK-004's data convention):
#   - amount > 0 is money IN (opening_balance, income); amount < 0 is money OUT.
#   - running balance = cumulative sum of signed amounts, ordered by date.
#   - trend_slope   = slope (INR/day) of a straight-line fit to running balance vs day index.
#                     Negative => net depleting (spending faster than income comes in).
#   - daily_avg     = average daily CONSUMPTION spend (all out-flows except `savings`, since a
#                     savings transfer is retained wealth, not burn). Reported positive.
#   - projected_zero_balance_date = last_date + current_balance / daily_avg. The intuitive
#                     "runway": at today's living-cost rate, when does liquid balance hit zero.

from datetime import date, timedelta

import numpy as np

NON_SPEND_CATEGORIES = {"income", "opening_balance", "salary", "refund"}
# Excluded from the burn rate specifically (retained wealth, not consumption):
NON_BURN_CATEGORIES = NON_SPEND_CATEGORIES | {"savings"}

# Cap the projection horizon so a near-flat/growing balance yields a finite, sane date
# instead of something absurd like the year 5000.
MAX_HORIZON_DAYS = 3650  # 10 years


def _parse(d: str) -> date:
    return date.fromisoformat(d[:10])


def _ordered(transactions: list):
    return sorted(transactions, key=lambda t: t.get("date", ""))


def compute_burn_rate(transactions: list, as_of: date | None = None) -> dict:
    if not transactions:
        raise ValueError("compute_burn_rate: no transactions provided")

    txns = _ordered(transactions)
    first = _parse(txns[0]["date"])
    last = _parse(txns[-1]["date"])
    as_of = as_of or last
    span_days = max(1, (last - first).days)

    # Running balance series over day-index.
    day_idx = []
    balances = []
    running = 0.0
    for t in txns:
        running += float(t.get("amount", 0))
        day_idx.append((_parse(t["date"]) - first).days)
        balances.append(running)
    current_balance = running

    # Straight-line trend of balance vs day index (INR/day).
    if len(set(day_idx)) >= 2:
        slope = float(np.polyfit(np.array(day_idx, dtype=float), np.array(balances, dtype=float), 1)[0])
    else:
        slope = 0.0

    # Daily consumption burn (out-flows excluding savings).
    consumption = sum(
        abs(float(t.get("amount", 0)))
        for t in txns
        if t.get("category") not in NON_BURN_CATEGORIES and float(t.get("amount", 0)) < 0
    )
    daily_avg = consumption / span_days

    # Runway: at today's consumption rate, when does the current balance reach zero.
    if current_balance <= 0:
        zero_date = as_of
    elif daily_avg <= 0:
        zero_date = as_of + timedelta(days=MAX_HORIZON_DAYS)
    else:
        days_left = min(MAX_HORIZON_DAYS, current_balance / daily_avg)
        zero_date = as_of + timedelta(days=round(days_left))

    return {
        "daily_avg": round(daily_avg, 2),
        "trend_slope": round(slope, 2),
        "projected_zero_balance_date": zero_date.isoformat(),
        # Internal fields (not part of CONTRACT-003 output shape, stripped at the API boundary)
        # so TASK-007 can reuse the exact same computation without a second regression path.
        "_current_balance": round(current_balance, 2),
        "_as_of": as_of.isoformat(),
    }
