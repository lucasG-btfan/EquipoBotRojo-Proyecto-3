"""Router de tickets de seguridad."""

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import usuario_actual

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.get("")
async def obtener_tickets(usuario: dict = Depends(usuario_actual)):
    """Retorna lista paginada de tickets, más recientes primero, con filtro por estado."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener tickets: {str(e)}")
