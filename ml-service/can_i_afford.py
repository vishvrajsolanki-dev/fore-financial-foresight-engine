# FORE — ml-service/can_i_afford.py
# Owner: TASK-007 (Vishvraj). CONTRACT-004 in docs/CONTRACTS.md.
#
# NOTE: standardized to ml-service/can_i_afford.py to stay consistent with classify.py and
# burn_rate.py's location (TASK-007_handout.md's "BRANCH / FILE OWNERSHIP" section originally
# said api/ml/can-i-afford.py — that path belonged to the earlier co-located-function plan before
# the Render migration; this file is the corrected, current location).
#
# Do NOT write a second regression path — insert the hypothetical expense into the transaction
# set fed to burn_rate.py's compute_burn_rate(), reuse it directly.
#
# POST /can-i-afford
# Input:  { item: string, amount: number, transactions: Transaction[] }
# Output: { affordable: boolean, day_shift: number, new_zero_balance_date: string, explanation: string }

from datetime import date

from burn_rate import compute_burn_rate


def _parse_date(value: str) -> date:
    return date.fromisoformat(str(value)[:10])


def can_i_afford(item: str, amount: float, transactions: list) -> dict:
    """CONTRACT-004: re-run CONTRACT-003's regressor with a hypothetical expense inserted.

    day_shift is (hypothetical_zero - baseline_zero).days — negative means the purchase pulls
    the zero-balance date earlier (less runway). affordable is false when the hypothetical
    zero-balance date is on or before today (into the past / already spent), with a sane
    explanation and a real ISO date — never a crash or a nonsense negative calendar date.
    """
    if not transactions:
        raise ValueError("transactions must be a non-empty array")

    try:
        amount = abs(float(amount))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"amount must be a number: {amount!r}") from exc

    item_label = str(item or "").strip() or "this purchase"

    # 1. Baseline projection from the unaltered history — same function TASK-003 ships.
    baseline = compute_burn_rate(transactions)
    baseline_zero = _parse_date(baseline["projected_zero_balance_date"])

    # 2. Insert the hypothetical expense on the last observed day (keeps the window honest —
    #    no invented empty future days) and re-run the SAME regressor. Amounts are positive;
    #    burn_rate treats non-credit categories as debits via -abs(amount).
    last_day = max(_parse_date(txn["date"]) for txn in transactions)
    hypothetical_txn = {
        "date": last_day.isoformat(),
        "category": "shopping",
        "amount": amount,
        "description": f"[hypothetical] {item_label}",
    }
    hypo = compute_burn_rate([*transactions, hypothetical_txn])
    hypo_zero = _parse_date(hypo["projected_zero_balance_date"])

    # 3. Day-shift = calendar delta between the two projected zero-balance dates.
    day_shift = (hypo_zero - baseline_zero).days

    # 4. Into the past (or already today with zero runway left) → not affordable.
    #    hypo_zero is always a real ISO date from the regressor (never negative / malformed).
    today = date.today()
    affordable = hypo_zero > today

    if affordable:
        direction = (
            f"{abs(day_shift)} day(s) earlier"
            if day_shift < 0
            else (
                f"{day_shift} day(s) later"
                if day_shift > 0
                else "by 0 days (no change to the projected date)"
            )
        )
        explanation = (
            f"Yes — you can afford {item_label} (₹{amount:,.0f}). "
            f"It moves your projected zero-balance date {direction}, "
            f"from {baseline_zero.isoformat()} to {hypo_zero.isoformat()}."
        )
    else:
        explanation = (
            f"Not right now — {item_label} (₹{amount:,.0f}) would push your projected "
            f"zero-balance date to {hypo_zero.isoformat()} "
            f"({abs(day_shift)} day(s) sooner than {baseline_zero.isoformat()}), "
            f"which is on or before today ({today.isoformat()}). "
            f"Consider waiting or trimming other spending first."
        )

    return {
        "affordable": bool(affordable),
        "day_shift": int(day_shift),
        "new_zero_balance_date": hypo_zero.isoformat(),
        "explanation": explanation,
    }
