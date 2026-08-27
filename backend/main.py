"""App principal del SIEM Dashboard — FastAPI."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: inicializa la DB. Shutdown: nothing."""
    await init_db()
    yield


app = FastAPI(
    title="SIEM Dashboard API",
    description="API backend para el panel de control SIEM del proyecto EquipoBotRojo",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — solo el origen configurado
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"estado": "ok"}


# --- Registro de routers ---
from backend.routers.auth import router as auth_router
from backend.routers.alertas import router as alerts_router
from backend.routers.contenedores import router as contenedores_router
from backend.routers.fail2ban import router as fail2ban_router
from backend.routers.ips import router as ips_router
from backend.routers.logs import router as logs_router
from backend.routers.metrics import router as metrics_router
from backend.routers.prometheus import router as prometheus_router
from backend.routers.tickets import router as tickets_router
from backend.routers.workflows import router as workflows_router
from backend.routers.wazuh import router as wazuh_router

app.include_router(auth_router)
app.include_router(contenedores_router)
app.include_router(prometheus_router)
app.include_router(alerts_router)
app.include_router(logs_router)
app.include_router(workflows_router)
app.include_router(ips_router)
app.include_router(tickets_router)
app.include_router(fail2ban_router)
app.include_router(wazuh_router)
app.include_router(metrics_router)
