"""Router de gestión de IPs — IPs bloqueadas y patrones de ataque."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api", tags=["IPs"])


@router.get("/ips/blocked")
async def obtener_ips_bloqueadas():
    """Retorna la tabla blocked_ips con filtro por estado activo/inactivo."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener IPs bloqueadas: {str(e)}")


@router.post("/ips/{ip}/unblock")
async def desbloquear_ip(ip: str):
    """Fuerza el desbloqueo de una IP."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al desbloquear IP {ip}: {str(e)}")


@router.get("/ips/attack-patterns")
async def obtener_patrones_ataque():
    """Retorna la tabla attack_patterns paginada con filtro por IP/categoría."""
    try:
        return {"mensaje": "Endpoint no implementado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener patrones de ataque: {str(e)}")
