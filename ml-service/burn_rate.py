# FORE — ml-service/burn_rate.py
# Owner: TASK-003 (Vishvraj). CONTRACT-003 in docs/CONTRACTS.md.
# Linear regression, honestly labeled as a straight-line trend — no forecasting-accuracy claim.
# Reused by TASK-007's can_i_afford.py: insert the hypothetical expense into the transaction set
# fed here, do not write a second regression path.
#
# POST /burn-rate
# Input:  { transactions: Transaction[] }
# Output: { daily_avg: number, trend_slope: number, projected_zero_balance_date: string }

from datetime import date, timedelta

# Credits (money in) counted toward the running balance, never toward spend.
_CREDIT_CATEGORIES = {"income", "salary", "credit", "refund", "cashback", "opening_balance"}

# If the trend line never crosses zero (balance flat or growing), the projection is capped at
# 10 years out rather than claiming a real date — a straight-line trend has nothing honest to
# say beyond "not on the horizon".
_PROJECTION_CAP_DAYS = 3650


def _parse_date(value: str) -> date:
    return date.fromisoformat(str(value)[:10])


def _signed_amount(txn: dict) -> float:
    """Credits positive (money in), debits negative (money out)."""
    amount = float(txn.get("amount", 0))
    category = str(txn.get("category", "")).strip().lower()
    # P2P transfers carry a real signed amount (in or out) — trust the sign.
    if category == "transfers":
        return amount
    if category in _CREDIT_CATEGORIES:
        return abs(amount)
    return -abs(amount)


def compute_burn_rate(transactions: list) -> dict:
    """CONTRACT-003: straight-line trend on the running balance.

    - daily_avg: average daily SPEND (debits only) across the observed window.
    - trend_slope: least-squares slope of end-of-day running balance vs day index
      (currency units per day; negative = spending faster than income, trending to zero).
    - projected_zero_balance_date: where the fitted line crosses zero, extrapolated from the
      last observed day. Capped at +10 years when the trend never crosses zero.
    """
    if not transactions:
        raise ValueError("transactions must be a non-empty array")

    dated: list[tuple[date, float]] = []
    for txn in transactions:
        try:
            dated.append((_parse_date(txn["date"]), _signed_amount(txn)))
        except (KeyError, ValueError, TypeError):
            raise ValueError(f"transaction missing a valid ISO date: {txn!r}")
    dated.sort(key=lambda pair: pair[0])

    first_day, last_day = dated[0][0], dated[-1][0]
    window_days = (last_day - first_day).days + 1

    total_spend = sum(-amt for _, amt in dated if amt < 0)
    daily_avg = total_spend / window_days

    # End-of-day running balance for every day in the window (days without transactions carry
    # the previous balance — they are real observations of "nothing changed").
    daily_net = [0.0] * window_days
    for txn_date, amt in dated:
        daily_net[(txn_date - first_day).days] += amt
    balances: list[float] = []
    running = 0.0
    for net in daily_net:
        running += net
        balances.append(running)

    # Hand-rolled least squares: slope = cov(t, balance) / var(t).
    n = window_days
    if n < 2:
        slope = 0.0
    else:
        mean_t = (n - 1) / 2
        mean_b = sum(balances) / n
        var_t = sum((t - mean_t) ** 2 for t in range(n))
        cov_tb = sum((t - mean_t) * (balances[t] - mean_b) for t in range(n))
        slope = cov_tb / var_t

    # Project from the fitted value at the last observed day, not the raw balance — the line is
    # the model, staying on it keeps the projection consistent with the reported slope.
    if n < 2:
        fitted_last = balances[-1]
    else:
        fitted_last = mean_b + slope * ((n - 1) - mean_t)

    if slope < 0 and fitted_last > 0:
        days_to_zero = min(int(fitted_last / -slope) + 1, _PROJECTION_CAP_DAYS)
    elif fitted_last <= 0:
        days_to_zero = 0  # already at/below zero on the fitted line
    else:
        days_to_zero = _PROJECTION_CAP_DAYS  # flat or growing — never crosses on this trend

    projected = last_day + timedelta(days=days_to_zero)

    return {
        "daily_avg": round(daily_avg, 2),
        "trend_slope": round(slope, 2),
        "projected_zero_balance_date": projected.isoformat(),
    }
