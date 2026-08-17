"""Modelo ORM para la tabla attack_patterns."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.sql import func

from backend.database import Base


class PatronAtaque(Base):
    __tablename__ = "attack_patterns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pattern_type = Column(String(50), nullable=False)
    source_ip = Column(INET, nullable=False)
    target_host = Column(String(255))
    first_seen = Column(DateTime, server_default=func.current_timestamp())
    last_seen = Column(DateTime, server_default=func.current_timestamp())
    occurrence_count = Column(Integer, default=1)
    is_blocked = Column(Boolean, default=False)
    recent_count = Column(Integer, default=1)
    window_start = Column(DateTime, server_default=func.current_timestamp())
