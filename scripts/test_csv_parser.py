#!/usr/bin/env python3
"""Quick unit checks for lib/csv/parseBankCsv.ts logic via inline samples."""

import subprocess
import sys

SAMPLE = """Date,Narration,Debit Amount,Credit Amount,Balance
01/04/2026,SWIGGY ORDER,450.00,,50000
02/04/2026,SALARY CREDIT,,70000,120000
03/04/2026,AMAZON PURCHASE,2500.00,,117500
"""

# Run via node -e with ts compiled - simpler to use npx tsx if available
SCRIPT = """
import { parseBankCsv } from './lib/csv/parseBankCsv.ts';
const r = parseBankCsv(`""" + SAMPLE.replace('`', '\\`') + """`);
if (r.transactions.length < 2) throw new Error('expected >=2 txns');
const debit = r.transactions.find(t => t.amount < 0);
if (!debit) throw new Error('expected debit');
console.log('OK csv parser', r.rowCount, r.detectedFormat);
"""

try:
    subprocess.run(
        ["npx", "--yes", "tsx", "-e", SCRIPT],
        cwd="/workspace",
        check=True,
        capture_output=True,
        text=True,
    )
    print("CSV parser smoke OK")
except FileNotFoundError:
    print("SKIP: tsx not available")
except subprocess.CalledProcessError as e:
    print(e.stderr or e.stdout)
    sys.exit(1)
