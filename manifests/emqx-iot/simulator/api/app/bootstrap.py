import asyncio
from pathlib import Path

from app.infrastructure.persistence.db import db
from app.settings import settings


async def init_db() -> None:
    await db.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")

    sql_dir = Path(settings.db_bootstrap_sql_dir)
    for path in sorted(sql_dir.glob("*.sql")):
        script = path.read_text(encoding="utf-8").strip()
        if not script:
            continue

        if path.name == "04-gold-continuous-aggregates.sql":
            statements = [s.strip() for s in script.split(";\n") if s.strip()]
            for statement in statements:
                await db.execute(f"{statement};")
        else:
            await db.execute(script)


async def init_db_with_retry() -> None:
    for attempt in range(1, settings.db_bootstrap_max_attempts + 1):
        try:
            await init_db()
            return
        except Exception:
            if attempt == settings.db_bootstrap_max_attempts:
                raise
            await asyncio.sleep(settings.db_bootstrap_retry_delay_ms / 1000)
