import asyncpg
from settings import settings


class Database:
    def __init__(self) -> None:
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self.pool = await asyncpg.create_pool(
            host=settings.db_host,
            port=settings.db_port,
            database=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
            min_size=1,
            max_size=10,
        )

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()
            self.pool = None

    def _require_pool(self) -> asyncpg.Pool:
        if self.pool is None:
            raise RuntimeError("Database pool has not been initialized")
        return self.pool

    async def fetch(self, query: str, *args):
        async with self._require_pool().acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        async with self._require_pool().acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def execute(self, query: str, *args):
        async with self._require_pool().acquire() as conn:
            return await conn.execute(query, *args)

    async def check_connected(self) -> bool:
        try:
            await self.fetchrow("SELECT 1")
            return True
        except Exception:
            return False


db = Database()
