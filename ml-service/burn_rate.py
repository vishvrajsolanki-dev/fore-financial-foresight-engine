# FORE — ml-service/burn_rate.py
# Owner: TASK-003 (Vishvraj). CONTRACT-003 in docs/CONTRACTS.md.
# Linear regression, honestly labeled as a straight-line trend — no forecasting-accuracy claim.
# Reused by TASK-007's can_i_afford.py: insert the hypothetical expense into the transaction set
# fed here, do not write a second regression path.
#
# POST /burn-rate
# Input:  { transactions: Transaction[] }
# Output: { daily_avg: number, trend_slope: number, projected_zero_balance_date: string }


def compute_burn_rate(transactions: list) -> dict:
    """
    TODO(TASK-003):
      1. Compute daily_avg spend across the transaction window.
      2. Fit a simple linear regression (cumulative spend vs. day index) for trend_slope.
         Negative slope = spending faster than income, trending toward zero balance sooner.
      3. Project projected_zero_balance_date from the current trend.
      4. Reused as-is by TASK-007 with a hypothetical expense appended to `transactions` —
         keep this function's signature stable, TASK-007 depends on it directly.
    """
    raise NotImplementedError("TASK-003: implement compute_burn_rate()")
