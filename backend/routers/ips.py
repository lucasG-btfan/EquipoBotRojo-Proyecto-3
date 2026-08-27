"""Router de gestión de IPs — IPs bloqueadas, patrones de ataque y métricas del sistema."""

import asyncio
import logging
import re
import subprocess
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, func, select
from sqlalchemy.types import String as TipoTexto

from backend.database import async_session_factory
from backend.dependencies import usuario_actual
from backend.models.ip_bloqueada import IPBloqueada
from backend.models.patron_ataque import PatronAtaque
from backend.models.metrica_sistema import MetricaSistema

from backend.services import fail2ban_service
from backend.services.fail2ban_service import ErrorFail2ban

router = APIRouter(prefix="/api", tags=["IPs"])

logger = logging.getLogger("backend.routers.ips")


@router.get("/ips/blocked")
async def obtener_ips_bloqueadas(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    activo: bool | None = Query(default=None),
    motivo: str | None = Query(default=None),
    usuario: dict = Depends(usuario_actual),
):
    """Retorna la tabla blocked_ips con paginación, filtro por estado activo/inactivo
    y búsqueda parcial (LIKE) por motivo (`reason`)."""
    try:
        async with async_session_factory() as session:
            # Filtro base
            consulta = select(IPBloqueada)
            conteo = select(func.count(IPBloqueada.id))

            if activo is not None:
                consulta = consulta.where(IPBloqueada.is_active == activo)
                conteo = conteo.where(IPBloqueada.is_active == activo)

            if motivo:
                filtro_motivo = IPBloqueada.reason.ilike(f"%{motivo}%")
                consulta = consulta.where(filtro_motivo)
                conteo = conteo.where(filtro_motivo)

            # Conteo total
            total_result = await session.execute(conteo)
            total = total_result.scalar() or 0

            # Consulta paginada
            query = consulta.order_by(IPBloqueada.blocked_at.desc()).limit(limit).offset(offset)
            result = await session.execute(query)
            ips = result.scalars().all()

            items = []
            for ip in ips:
                items.append({
                    "id": ip.id,
                    "ip_address": ip.ip_address,
                    "threat_score": ip.threat_score,
                    "reason": ip.reason,
                    "blocked_at": str(ip.blocked_at) if ip.blocked_at else None,
                    "blocked_until": str(ip.blocked_until) if ip.blocked_until else None,
                    "is_active": ip.is_active,
                })

            return {"items": items, "total": total, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener IPs bloqueadas: {str(e)}",
        )


@router.post("/ips/{ip}/unblock")
async def desbloquear_ip(ip: str, usuario: dict = Depends(usuario_actual)):
    """Fuerza el desbloqueo de una IP ejecutando fail2ban-client vía Docker.

    NO modifica PostgreSQL directamente — fail2ban dispara el workflow de n8n.
    """
    try:
        # Validar formato de IP
        if not re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", ip):
            raise HTTPException(
                status_code=400,
                detail=f"Formato de IP inválido: {ip}",
            )

        # Verificar que la IP esté baneada en la BD
        async with async_session_factory() as session:
            query = select(IPBloqueada).where(
                IPBloqueada.ip_address == ip,
                IPBloqueada.is_active == True,
            )
            result = await session.execute(query)
            ip_bloqueada = result.scalar_one_or_none()

            if not ip_bloqueada:
                raise HTTPException(
                    status_code=404,
                    detail=f"La IP {ip} no se encuentra baneada o no existe",
                )

        # Ejecutar desbloqueo vía Docker
        def _ejecutar_desban():
            """Ejecuta el comando fail2ban-client de forma síncrona."""
            resultado = subprocess.run(
                [
                    "docker", "exec", "fail2ban",
                    "fail2ban-client", "set", "n8n-soar-jail", "unbanip", ip,
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            return resultado

        resultado = await asyncio.to_thread(_ejecutar_desban)

        if resultado.returncode != 0:
            mensaje_error = resultado.stderr.strip()
            logger.warning("Error al desbanear IP %s: %s", ip, mensaje_error)
            raise HTTPException(
                status_code=500,
                detail=f"Error al desbanear la IP {ip}: {mensaje_error}",
            )

        return {"mensaje": f"IP {ip} desbaneada correctamente"}

    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=f"Timeout al intentar desbanear la IP {ip}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al desbanear IP {ip}: {str(e)}",
        )


@router.post("/ips/{ip}/ban")
async def banear_ip(ip: str, usuario: dict = Depends(usuario_actual)):
    """Banea una IP ejecutando fail2ban-client vía Docker.

    End-point de prueba para verificar que la cadena fail2ban funciona.
    """
    try:
        # Validar formato de IP
        if not re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", ip):
            raise HTTPException(
                status_code=400,
                detail=f"Formato de IP inválido: {ip}",
            )

        resultado = await fail2ban_service.banear_ip(ip)
        return resultado

    except HTTPException:
        raise
    except ErrorFail2ban as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al banear IP {ip}: {str(e)}",
        )


@router.get("/ips/attack-patterns")
async def obtener_patrones_ataque(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    ip: str | None = Query(default=None),
    categoria: str | None = Query(default=None),
    usuario: dict = Depends(usuario_actual),
):
    """Retorna la tabla attack_patterns paginada con búsqueda parcial (LIKE) por IP/categoría."""
    try:
        async with async_session_factory() as session:
            # Filtro base
            consulta = select(PatronAtaque)
            conteo = select(func.count(PatronAtaque.id))

            if ip:
                # source_ip es INET: se castea a texto para poder usar LIKE.
                filtro_ip = cast(PatronAtaque.source_ip, TipoTexto).ilike(f"%{ip}%")
                consulta = consulta.where(filtro_ip)
                conteo = conteo.where(filtro_ip)

            if categoria:
                filtro_categoria = PatronAtaque.pattern_type.ilike(f"%{categoria}%")
                consulta = consulta.where(filtro_categoria)
                conteo = conteo.where(filtro_categoria)

            # Conteo total
            total_result = await session.execute(conteo)
            total = total_result.scalar() or 0

            # Consulta paginada, ordenada por last_seen descendente
            query = consulta.order_by(PatronAtaque.last_seen.desc()).limit(limit).offset(offset)
            result = await session.execute(query)
            patrones = result.scalars().all()

            items = []
            for pat in patrones:
                items.append({
                    "id": pat.id,
                    "pattern_type": pat.pattern_type,
                    "source_ip": str(pat.source_ip) if pat.source_ip else None,
                    "target_host": pat.target_host,
                    "first_seen": str(pat.first_seen) if pat.first_seen else None,
                    "last_seen": str(pat.last_seen) if pat.last_seen else None,
                    "occurrence_count": pat.occurrence_count,
                    "is_blocked": pat.is_blocked,
                })

            return {"items": items, "total": total, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener patrones de ataque: {str(e)}",
        )


@router.get("/metrics/system")
async def obtener_metricas_sistema(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    usuario: dict = Depends(usuario_actual),
):
    """Retorna la tabla system_metrics con paginación y filtro opcional por rango de
    fechas (`desde`/`hasta`, inclusive), ordenada por timestamp descendente."""
    try:
        async with async_session_factory() as session:
            consulta = select(MetricaSistema)
            conteo = select(func.count(MetricaSistema.id))

            if desde is not None:
                consulta = consulta.where(MetricaSistema.timestamp >= datetime.combine(desde, datetime.min.time()))
                conteo = conteo.where(MetricaSistema.timestamp >= datetime.combine(desde, datetime.min.time()))

            if hasta is not None:
                limite_superior = datetime.combine(hasta, datetime.min.time()) + timedelta(days=1)
                consulta = consulta.where(MetricaSistema.timestamp < limite_superior)
                conteo = conteo.where(MetricaSistema.timestamp < limite_superior)

            # Conteo total
            total_result = await session.execute(conteo)
            total = total_result.scalar() or 0

            # Consulta paginada, ordenada por timestamp descendente
            query = consulta.order_by(MetricaSistema.timestamp.desc()).limit(limit).offset(offset)
            result = await session.execute(query)
            metricas = result.scalars().all()

            items = []
            for met in metricas:
                items.append({
                    "id": met.id,
                    "timestamp": str(met.timestamp) if met.timestamp else None,
                    "hostname": met.hostname,
                    "metric_name": met.metric_name,
                    "metric_value": float(met.metric_value) if met.metric_value is not None else None,
                    "unit": met.unit,
                })

            return {"items": items, "total": total, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener métricas del sistema: {str(e)}",
        )
