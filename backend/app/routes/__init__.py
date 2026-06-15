from app.routes.resources import router as resources_router
from app.routes.scans import router as scans_router
from app.routes.dashboard import router as dashboard_router

__all__ = ["resources_router", "scans_router", "dashboard_router"]
