# FORE — ml-service/can_i_afford.py
# Owner: TASK-007 (Vishvraj). CONTRACT-004 in docs/CONTRACTS.md.
#
# Do NOT write a second regression path — insert the hypothetical expense into the transaction
# set fed to burn_rate.py's compute_burn_rate(), reuse it directly.
#
# POST /can-i-afford
# Input:  { item: string, amount: number, transactions: Transaction[] }
# Output: { affordable: boolean, day_shift: number, new_zero_balance_date: string, explanation: string }

from datetime import date

from burn_rate import _parse, _ordered, compute_burn_rate


def can_i_afford(item: str, amount: float, transactions: list) -> dict:
    if not transactions:
        raise ValueError("can_i_afford: no transactions provided")
    amount = abs(float(amount))

    # 1. Baseline projection from the real, unaltered history.
    baseline = compute_burn_rate(transactions)
    baseline_zero = _parse(baseline["projected_zero_balance_date"])
    as_of = _parse(baseline["_as_of"])

    # 2. Insert the hypothetical expense as a money-out row dated "now" (the as-of date), then
    #    re-run the SAME regressor. No parallel math path.
    hypothetical_txn = {
        "date": as_of.isoformat(),
        "category": "shopping",
        "amount": -amount,
        "description": f"[hypothetical] {item}",
    }
    hypo = compute_burn_rate(_ordered(list(transactions) + [hypothetical_txn]), as_of=as_of)
    hypo_zero = _parse(hypo["projected_zero_balance_date"])

    # 3. Day-shift = how many days the zero-balance date moves (negative = sooner).
    day_shift = (hypo_zero - baseline_zero).days

    # 4. Affordable if the purchase still leaves a positive balance with runway into the future.
    remaining_balance = hypo["_current_balance"]
    affordable = remaining_balance > 0 and hypo_zero > as_of

    if affordable:
        explanation = (
            f"Yes — you can afford {item} (₹{amount:,.0f}). It moves your projected "
            f"zero-balance date {abs(day_shift)} day(s) earlier, from {baseline_zero.isoformat()} "
            f"to {hypo_zero.isoformat()}, leaving about ₹{remaining_balance:,.0f} in balance."
        )
    else:
        explanation = (
            f"Not right now — {item} (₹{amount:,.0f}) would push your balance to about "
            f"₹{remaining_balance:,.0f} and bring your zero-balance date to {hypo_zero.isoformat()} "
            f"({abs(day_shift)} day(s) sooner). Consider waiting or trimming other spending first."
        )

    return {
        "affordable": bool(affordable),
        "day_shift": int(day_shift),
        "new_zero_balance_date": hypo_zero.isoformat(),
        "explanation": explanation,
    }
