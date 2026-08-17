"""Modelo ORM para la tabla system_metrics."""

from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from backend.database import Base


class MetricaSistema(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, server_default=func.current_timestamp())
    hostname = Column(String(255), nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Numeric)
    unit = Column(String(20))
