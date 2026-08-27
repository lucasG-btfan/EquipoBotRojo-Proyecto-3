"""Conexión async a PostgreSQL con SQLAlchemy."""

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

# AGENTS.md documenta DATABASE_URL sin driver explícito (postgresql://...);
# el motor async requiere el driver psycopg en la URL (psycopg3 funciona
# nativamente en Windows, a diferencia de asyncpg que falla con WinError 64).
_database_url = make_url(settings.DATABASE_URL)
if _database_url.drivername == "postgresql":
    _database_url = _database_url.set(drivername="postgresql+psycopg")

engine = create_async_engine(
    _database_url,
    pool_timeout=10,
    pool_recycle=1800,
    connect_args={"connect_timeout": 10},
)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base para todos los modelos ORM."""
    pass


async def init_db() -> None:
    """Crea todas las tablas definidas en los modelos.

    Si la base de datos no es accesible, registra un warning pero no
    detiene el arranque del servidor — los endpoints que no dependen
    de la DB seguirán funcionando.
    """
    import logging

    logger = logging.getLogger("backend.database")
    try:
        from backend.models import alerta, patron_ataque, metrica_sistema, ip_bloqueada, ticket  # noqa: F401
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Base de datos inicializada correctamente.")
    except Exception as e:
        logger.warning(
            "No se pudo conectar a la base de datos: %s. "
            "El servidor seguirá funcionando sin persistencia.",
            str(e),
        )
