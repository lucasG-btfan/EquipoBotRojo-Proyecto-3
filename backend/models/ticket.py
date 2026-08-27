"""Modelo ORM para la tabla security_tickets."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from backend.database import Base


class Ticket(Base):
    __tablename__ = "security_tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(255))
    description = Column(Text)
    status = Column(String(50), default="open")
    priority = Column(String(50))
    category = Column(String(100))
    source_ip = Column(String(45))
    threat_score = Column(Integer)
    assigned_to = Column(String(255))
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp())
    alert_reference = Column(Integer, ForeignKey("alerts.id", ondelete="SET NULL"))
