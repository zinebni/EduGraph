import os
from pathlib import Path

# Database
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = f"sqlite+aiosqlite:///{BASE_DIR / 'edugraph.db'}"

# Defaults
DEFAULT_MODEL = "gemini-3.1-flash-lite"
DEFAULT_TEMPERATURE = 1.0
