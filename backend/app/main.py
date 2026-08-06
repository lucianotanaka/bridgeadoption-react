"""
Bridge Adoption API — FastAPI application entry point.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import test_connection
from app.auth.router import router as auth_router
from app.tasks.router import router as tasks_router
from app.adoption.forecast_router import router as forecast_router
from app.adoption.cisco_lci_router import router as cisco_lci_router
from app.adoption.extras_router import (
    csm_router, target_router, lci_status_router, rebate_router, usecase_router,
)
from app.adoption.lci_eligible_status_router import router as lci_eligible_status_router
from app.modules.sections_router import (
    portfolio_router, projects_router, renewals_router, admin_router,
)
from app.modules.public_router import public_router, importer_router

# ─────────────────────────────────────────
# Logging
# ─────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────
# App
# ─────────────────────────────────────────
settings = get_settings()

app = FastAPI(
    title="Bridge Adoption API",
    version="1.0.0",
    description="REST API for Bridge Adoption — React frontend backend",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─────────────────────────────────────────
# CORS
# ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# Routers
# ─────────────────────────────────────────
app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(forecast_router)
app.include_router(cisco_lci_router)
app.include_router(csm_router)
app.include_router(target_router)
app.include_router(lci_status_router)
app.include_router(lci_eligible_status_router)
app.include_router(rebate_router)
app.include_router(usecase_router)
app.include_router(portfolio_router)
app.include_router(projects_router)
app.include_router(renewals_router)
app.include_router(admin_router)
app.include_router(public_router)
app.include_router(importer_router)

# ─────────────────────────────────────────
# Health check
# ─────────────────────────────────────────
@app.get("/api/health", tags=["health"])
def health_check():
    db_ok = test_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "api": "Bridge Adoption API",
        "version": "1.0.0",
        "database": "connected" if db_ok else "unreachable",
        "environment": settings.app_env,
    }


@app.on_event("startup")
async def on_startup():
    logger.info("Bridge Adoption API starting up...")
    db_ok = test_connection()
    if db_ok:
        logger.info("Database connection: OK")
    else:
        logger.warning("Database connection: FAILED — check .env credentials")
