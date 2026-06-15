import os
import json
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.encoders import jsonable_encoder

from app.database import init_db
from app.routes.resources import router as resources_router
from app.routes.scans import router as scans_router
from app.routes.dashboard import router as dashboard_router
from app.services.seed import seed_demo_data

logger = structlog.get_logger(__name__)


class CamelJSONResponse(JSONResponse):
    """JSON response that serializes Pydantic models using their aliases (camelCase)."""

    def render(self, content) -> bytes:
        if hasattr(content, "model_dump"):
            content = content.model_dump(by_alias=True, mode="json")
        elif isinstance(content, list):
            content = [
                item.model_dump(by_alias=True, mode="json") if hasattr(item, "model_dump") else item
                for item in content
            ]
        return json.dumps(
            content,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup.init_db")
    init_db()
    seed_demo_data()
    logger.info("startup.complete")
    yield
    logger.info("shutdown")


app = FastAPI(
    title="SentinelAI Security Platform",
    description="AI Red-Team Security Platform — Botpress Connector",
    version="1.0.0",
    lifespan=lifespan,
    default_response_class=CamelJSONResponse,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "sentinelai-api"}


@app.get("/ready", tags=["health"])
def ready():
    return {"status": "ready"}


@app.get("/api/healthz", tags=["health"])
def healthz():
    return {"status": "ok"}


app.include_router(resources_router)
app.include_router(scans_router)
app.include_router(dashboard_router)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "artifacts", "security-platform", "dist", "public")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
