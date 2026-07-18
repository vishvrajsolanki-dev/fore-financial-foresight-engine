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

from burn_rate import compute_burn_rate


def can_i_afford(item: str, amount: float, transactions: list) -> dict:
    """
    TODO(TASK-007):
      1. Compute the baseline projected_zero_balance_date via compute_burn_rate(transactions).
      2. Insert a hypothetical transaction for `item`/`amount`, re-run compute_burn_rate().
      3. day_shift = difference in days between baseline and hypothetical zero-balance dates.
      4. affordable: false if the hypothetical zero-balance date moves into the past — return a
         sane explanation, not a crash or a negative date.
      5. This is THE contract-violation risk in the whole product (CONTRACT-004) — test this more,
         not less, relative to its time box. Hand-calculate expected day_shift for a known persona
         and compare before merging.
    """
    raise NotImplementedError("TASK-007: implement can_i_afford()")
