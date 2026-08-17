"""Router de tickets de seguridad."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.get("")
async def obtener_tickets():
    """Retorna lista paginada de tickets, más recientes primero, con filtro por estado."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener tickets: {str(e)}")
