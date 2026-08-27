"""Modelo ORM para la tabla blocked_ips."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from backend.database import Base


class IPBloqueada(Base):
    __tablename__ = "blocked_ips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ip_address = Column(String(45), unique=True, nullable=False)
    threat_score = Column(Integer)
    reason = Column(Text)
    blocked_at = Column(DateTime, server_default=func.current_timestamp())
    blocked_until = Column(DateTime)
    is_active = Column(Boolean, default=True)
