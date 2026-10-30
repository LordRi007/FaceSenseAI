from app.api.cameras import router as cameras_router
from app.api.scanner import router as scanner_router
from app.api.participants import router as participants_router
from app.api.analytics import router as analytics_router
from app.api.settings import router as settings_router

__all__ = [
    "cameras_router",
    "scanner_router",
    "participants_router",
    "analytics_router",
    "settings_router"
]

