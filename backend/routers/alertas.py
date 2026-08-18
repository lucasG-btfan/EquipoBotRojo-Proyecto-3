"""Router de alertas — log de alertas y alertas recientes de PostgreSQL."""

import asyncio
import logging
from collections import deque

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import async_session_factory
from backend.dependencies import usuario_actual
from backend.models.alerta import Alerta

router = APIRouter(prefix="/api/alerts", tags=["Alertas"])

logger = logging.getLogger("backend.routers.alertas")


@router.get("/recent")
async def obtener_alertas_recientes(
    limit: int = Query(default=5, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    usuario: dict = Depends(usuario_actual),
):
    """Retorna las últimas alertas desde PostgreSQL, con paginación."""
    try:
        # Ajustar limit fuera de rango al default
        if limit <= 0 or limit > 50:
            limit = 5

        async with async_session_factory() as session:
            # Conteo total de alertas
            total_result = await session.execute(select(func.count(Alerta.id)))
            total = total_result.scalar() or 0

            # Consulta paginada, ordenada por timestamp descendente
            query = (
                select(Alerta)
                .order_by(Alerta.timestamp.desc())
                .limit(limit)
                .offset(offset)
            )
            result = await session.execute(query)
            alertas = result.scalars().all()

            # Mapear a dict con solo los campos requeridos (11 campos)
            items = []
            for alerta in alertas:
                items.append(
                    {
                        "id": alerta.id,
                        "timestamp": str(alerta.timestamp) if alerta.timestamp else None,
                        "severity": alerta.severity,
                        "category": alerta.category,
                        "source_host": alerta.source_host,
                        "source_ip": str(alerta.source_ip) if alerta.source_ip else None,
                        "target_host": alerta.target_host,
                        "event_count": alerta.event_count,
                        "description": alerta.description,
                        "risk_score": alerta.risk_score,
                        "risk_level": alerta.risk_level,
                    }
                )

            return {"items": items, "total": total, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener alertas recientes: {str(e)}",
        )


@router.get("/log")
async def obtener_log_alertas(usuario: dict = Depends(usuario_actual)):
    """Retorna las últimas 50 líneas de alerts.log."""

    def _leer_log():
        """Lee las últimas 50 líneas del archivo de log de forma síncrona."""
        with open(settings.ALERTS_LOG_PATH, "r", encoding="utf-8") as f:
            return [linea.rstrip("\n") for linea in deque(f, 50)]

    try:
        lineas = await asyncio.to_thread(_leer_log)
        return {"lineas": lineas}
    except FileNotFoundError:
        return {"lineas": []}
    except PermissionError:
        logger.warning(
            "Sin permisos de lectura sobre el archivo de log: %s",
            settings.ALERTS_LOG_PATH,
        )
        return {"lineas": []}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener log de alertas: {str(e)}",
        )
