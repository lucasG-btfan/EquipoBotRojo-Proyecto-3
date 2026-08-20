"""Router de tickets de seguridad."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select

from backend.database import async_session_factory
from backend.dependencies import usuario_actual
from backend.models.ticket import Ticket

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.get("")
async def obtener_tickets(
    limit: int = Query(default=15, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    estado: str | None = Query(default=None),
    prioridad: str | None = Query(default=None),
    usuario: dict = Depends(usuario_actual),
):
    """Retorna lista paginada de tickets, más recientes primero, con filtro por estado y prioridad."""
    try:
        async with async_session_factory() as session:
            # Filtro base
            consulta = select(Ticket)
            conteo = select(func.count(Ticket.id))

            if estado is not None:
                consulta = consulta.where(Ticket.status == estado)
                conteo = conteo.where(Ticket.status == estado)

            if prioridad is not None:
                consulta = consulta.where(Ticket.priority == prioridad)
                conteo = conteo.where(Ticket.priority == prioridad)

            # Conteo total
            total_result = await session.execute(conteo)
            total = total_result.scalar() or 0

            # Consulta paginada, ordenada por created_at descendente
            query = consulta.order_by(Ticket.created_at.desc()).limit(limit).offset(offset)
            result = await session.execute(query)
            tickets = result.scalars().all()

            items = []
            for t in tickets:
                items.append({
                    "id": t.id,
                    "ticket_number": t.ticket_number,
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                    "priority": t.priority,
                    "category": t.category,
                    "source_ip": t.source_ip,
                    "threat_score": t.threat_score,
                    "assigned_to": t.assigned_to,
                    "created_at": str(t.created_at) if t.created_at else None,
                    "updated_at": str(t.updated_at) if t.updated_at else None,
                    "alert_reference": t.alert_reference,
                })

            return {"items": items, "total": total, "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener tickets: {str(e)}",
        )
