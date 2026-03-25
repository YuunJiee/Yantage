from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# ── App Lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Replaces deprecated @app.on_event('startup'/'shutdown')."""
    logger.info("Starting Yantage backend…")

    # Apply all pending Alembic migrations (creates tables on first run,
    # applies incremental changes on subsequent runs).
    from . import migrations as db_migrations
    db_migrations.run_migrations()

    # Register the running asyncio event loop with the SSE manager
    # so background threads can safely broadcast to connected clients.
    import asyncio
    from .routers.sse import manager as sse_manager
    sse_manager.set_loop(asyncio.get_running_loop())

    # Start background scheduler
    from . import scheduler as sched_module
    sched_module.start_scheduler()

    yield  # ← application runs here

    # Graceful shutdown
    sched_module.shutdown_scheduler()
    logger.info("Yantage backend shut down.")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(title="Personal Asset Dashboard API", lifespan=lifespan)

# Trust Cloudflare Tunnel / Nginx Headers
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# CORS setup
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,https://assets.yuunjiee.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routers import dashboard, assets, stats, goals, alerts, transactions, budgets, settings, system, integrations, income
from .routers.sse import router as sse_router

app.include_router(dashboard.router)
app.include_router(assets.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(stats.router)
app.include_router(alerts.router)
app.include_router(budgets.router)
app.include_router(income.router)
app.include_router(settings.router)
app.include_router(system.router)
app.include_router(integrations.router)
app.include_router(sse_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Asset Dash API"}
