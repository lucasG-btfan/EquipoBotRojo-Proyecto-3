"""Router de métricas de sistema.

El endpoint /api/metrics/system está implementado en ips.py (CH09).
Este router se mantiene para futuras métricas adicionales.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/metrics", tags=["Métricas"])
