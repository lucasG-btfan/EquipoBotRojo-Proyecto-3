"""Modelo ORM para la tabla alerts."""

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.sql import func

from backend.database import Base


class Alerta(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, server_default=func.current_timestamp())
    severity = Column(String(20), nullable=False)
    category = Column(String(50), nullable=False)
    source_host = Column(String(255))
    source_ip = Column(INET)
    target_host = Column(String(255))
    event_count = Column(Integer, default=1)
    description = Column(Text)
    raw_log = Column(Text)
    status = Column(String(20), default="new")
    assigned_to = Column(String(100))
    notes = Column(Text)
    resolved_at = Column(DateTime)
    risk_score = Column(Integer)
    risk_level = Column(String(20))
    threat_reputation = Column(String(50))
    threat_intel = Column(JSONB)
