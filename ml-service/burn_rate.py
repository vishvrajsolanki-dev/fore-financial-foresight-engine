# FORE — ml-service/burn_rate.py
# Owner: TASK-003 (Vishvraj). CONTRACT-003 in docs/CONTRACTS.md.
# Linear regression, honestly labeled as a straight-line trend — no forecasting-accuracy claim.
# Reused by TASK-007's can_i_afford.py: insert the hypothetical expense into the transaction set
# fed here, do not write a second regression path.
#
# POST /burn-rate
# Input:  { transactions: Transaction[] }
# Output: { daily_avg, trend_slope, projected_zero_balance_date, weekly_seasonal, ... }

from datetime import date, timedelta
import math

_CREDIT_CATEGORIES = {"income", "salary", "credit", "refund", "cashback", "opening_balance"}
_PROJECTION_CAP_DAYS = 3650


def _parse_date(value: str) -> date:
    return date.fromisoformat(str(value)[:10])


def _signed_amount(txn: dict) -> float:
    amount = float(txn.get("amount", 0))
    category = str(txn.get("category", "")).strip().lower()
    if category == "transfers":
        return amount
    if category in _CREDIT_CATEGORIES:
        return abs(amount)
    return -abs(amount)


def _weekly_seasonal_factors(dated: list[tuple[date, float]]) -> list[float]:
    dow_spend = [0.0] * 7
    dow_count = [0] * 7
    for txn_date, amt in dated:
        if amt >= 0:
            continue
        dow = txn_date.weekday()
        # Python weekday: Mon=0 … convert to Sun=0
        dow_sun = (dow + 1) % 7
        dow_spend[dow_sun] += -amt
        dow_count[dow_sun] += 1
    daily_avgs = [dow_spend[i] / dow_count[i] if dow_count[i] else 0.0 for i in range(7)]
    overall = sum(daily_avgs) / 7 or 1.0
    return [round(v / overall, 3) if overall > 0 else 1.0 for v in daily_avgs]


def compute_burn_rate(transactions: list) -> dict:
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
    weekly_seasonal = _weekly_seasonal_factors(dated)

    daily_net = [0.0] * window_days
    for txn_date, amt in dated:
        daily_net[(txn_date - first_day).days] += amt
    balances: list[float] = []
    running = 0.0
    for net in daily_net:
        running += net
        balances.append(running)

    n = window_days
    if n < 2:
        slope = 0.0
    else:
        mean_t = (n - 1) / 2
        mean_b = sum(balances) / n
        var_t = sum((t - mean_t) ** 2 for t in range(n))
        cov_tb = sum((t - mean_t) * (balances[t] - mean_b) for t in range(n))
        slope = cov_tb / var_t

    if n < 2:
        fitted_last = balances[-1]
    else:
        fitted_last = mean_b + slope * ((n - 1) - mean_t)

    residual_std = 0.0
    if n >= 3:
        residuals = [balances[t] - (mean_b + slope * (t - mean_t)) for t in range(n)]
        mse = sum(r * r for r in residuals) / (n - 2)
        residual_std = math.sqrt(mse)

    if slope < 0 and fitted_last > 0:
        trend_days = min(int(fitted_last / -slope) + 1, _PROJECTION_CAP_DAYS)
    elif fitted_last <= 0:
        trend_days = 0
    else:
        trend_days = _PROJECTION_CAP_DAYS
    trend_zero = last_day + timedelta(days=trend_days)

    # Primary projected zero = runway if income/credits stopped (matches PAST UI caption).
    last_balance = balances[-1] if balances else 0.0
    if last_balance <= 0:
        runway_days = 0
    elif daily_avg <= 0:
        runway_days = _PROJECTION_CAP_DAYS
    else:
        runway_days = min(int(last_balance / daily_avg), _PROJECTION_CAP_DAYS)
    projected = last_day + timedelta(days=runway_days)

    interval_days = int(round(residual_std / abs(slope))) if slope < 0 and residual_std > 0 else 0
    projected_low = last_day + timedelta(days=max(0, runway_days - interval_days))
    projected_high = last_day + timedelta(days=min(runway_days + interval_days, _PROJECTION_CAP_DAYS))

    return {
        "daily_avg": round(daily_avg, 2),
        "trend_slope": round(slope, 2),
        "projected_zero_balance_date": projected.isoformat(),
        "weekly_seasonal": weekly_seasonal,
        "projected_zero_balance_date_low": projected_low.isoformat(),
        "projected_zero_balance_date_high": projected_high.isoformat(),
        "trend_zero_balance_date": trend_zero.isoformat(),
        "runway_days_if_income_stopped": runway_days,
    }
