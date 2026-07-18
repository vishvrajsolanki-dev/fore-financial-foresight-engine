# FORE — ml-service/conftest.py
# Makes the ml-service modules importable by their bare names (classify, burn_rate, ...) when
# pytest is invoked from anywhere, matching how they import each other and how uvicorn runs them.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
