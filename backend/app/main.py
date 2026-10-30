import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.session import init_db, SessionLocal
from app.models.database import Setting, CameraSession, Participant, Registration, CheckIn, ExpressionEvent
from app.api import (
    cameras_router,
    scanner_router,
    participants_router,
    analytics_router,
    settings_router
)
from app.websocket.connection_manager import ws_manager

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))
SNAPSHOTS_DIR = os.path.join(STORAGE_DIR, "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

def seed_initial_data():
    db = SessionLocal()
    try:
        # 1. Initialize Settings if not exists
        setting = db.query(Setting).first()
        if not setting:
            setting = Setting(
                camera_id="default",
                detection_confidence=0.6,
                analysis_interval=150,
                save_history=True,
                retention_days=30
            )
            db.add(setting)

        # 2. Initialize default camera session
        active_session = db.query(CameraSession).filter(CameraSession.status == "ACTIVE").first()
        if not active_session:
            session = CameraSession(
                camera_label="Integrated HD Webcam (Default)",
                status="ACTIVE"
            )
            db.add(session)

        db.commit()
    except Exception as e:
        print(f"[Seed] Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    seed_initial_data()
    try:
        from app.computer_vision.face_recognizer import face_recognizer
        from app.computer_vision.detector import vision_pipeline
        db = SessionLocal()
        face_recognizer.load_registered_participants(db, vision_pipeline)
        db.close()
    except Exception as rec_err:
        print(f"[FaceSense AI] Face recognizer init error: {rec_err}")
    print("[FaceSense AI] Backend initialized. AI models, face recognizer, and database ready.")
    yield
    # Shutdown
    print("[FaceSense AI] Shutting down services.")

app = FastAPI(
    title="FaceSense AI — Real-Time Facial Mood & Feeling Analytics System",
    description="Backend API for live face detection, facial-expression classification, consent-based participant registration, and analytics.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve storage files (snapshots, exports)
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")

from fastapi.responses import FileResponse

# Include API Routers under /api
app.include_router(cameras_router, prefix="/api")
app.include_router(scanner_router, prefix="/api")
app.include_router(participants_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

# Real-Time WebSocket for camera frame processing
@app.websocket("/ws/face-analysis")
async def websocket_face_analysis(websocket: WebSocket):
    await ws_manager.connect(websocket)
    await ws_manager.handle_stream(websocket)

@app.get("/api/info")
def api_info():
    return {
        "system": "FaceSense AI",
        "description": "Real-Time Facial Mood & Feeling Analytics System",
        "version": "1.0.0",
        "status": "online",
        "disclaimer": "Predictions are estimated facial expressions and do not represent psychological diagnosis or genuine emotional state.",
        "endpoints": {
            "docs": "/docs",
            "scanner": "/api/scanner",
            "participants": "/api/participants",
            "analytics": "/api/analytics",
            "websocket": "/ws/face-analysis"
        }
    }

# Production Frontend SPA Static Mount
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        # Allow API and Storage routes to fall through to their respective routers
        if full_path.startswith("api/") or full_path.startswith("storage/") or full_path == "docs" or full_path == "openapi.json":
            return {"detail": "Not Found"}
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "system": "FaceSense AI",
            "description": "Real-Time Facial Mood & Feeling Analytics System",
            "version": "1.0.0",
            "status": "online",
            "disclaimer": "Predictions are estimated facial expressions and do not represent psychological diagnosis or genuine emotional state.",
            "endpoints": {
                "docs": "/docs",
                "scanner_status": "/api/scanner/status",
                "participants": "/api/participants",
                "analytics_overview": "/api/analytics/overview",
                "websocket": "/ws/face-analysis"
            }
        }

