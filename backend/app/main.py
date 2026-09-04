from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.database import init_db, get_db
from backend.app.utils.seed import seed_initial_data
from backend.app.routers import (
    auth, users, patients, doctors, medicines,
    appointments, prescriptions, billing, admin, dashboard
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    await init_db()
    # Seed initial data if empty
    async for session in get_db():
        try:
            await seed_initial_data(session)
        except Exception as e:
            print(f"Seed note: {e}")
        break
    yield

tags_metadata = [
    {
        "name": "Authentication",
        "description": "JWT authentication, account registration, login, and Google OAuth with seamless merging."
    },
    {
        "name": "Patients",
        "description": "Patient demographic records, clinical history, and inline profile updates."
    },
    {
        "name": "Doctors",
        "description": "Practitioner registry, medical specialties, and licensing records."
    },
    {
        "name": "Medicines (Inventory)",
        "description": "Pharmacy drug inventory, batch tracking, expiry monitoring, and stock levels."
    },
    {
        "name": "Appointments",
        "description": "Patient-Doctor consultation scheduling and status tracking."
    },
    {
        "name": "Prescriptions",
        "description": "Clinical Rx medication records with print-to-PDF support."
    },
    {
        "name": "Billing & Accounting",
        "description": "Pharmacy invoices, revenue calculation, and financial accounting stats."
    },
    {
        "name": "Admin User Management",
        "description": "User role management (ADMIN vs STAFF) and account control."
    },
    {
        "name": "Admin Backup & Restore",
        "description": "Full PostgreSQL database JSON export and transactional restore."
    }
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack Pharmacy Accounting & Management System API with Neon PostgreSQL, JWT Auth, and Render deployment.",
    version=settings.VERSION,
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Vite React frontend and Render deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ORIGINS == ["*"] else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Include API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(medicines.router)
app.include_router(appointments.router)
app.include_router(prescriptions.router)
app.include_router(billing.router)
app.include_router(admin.router)
app.include_router(dashboard.router)

@app.get("/api/health", tags=["Health"], summary="System health check")
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.post("/api/seed", tags=["Development"], summary="Populate demo data (safe idempotent)")
async def seed_data(db: AsyncSession = Depends(get_db)):
    result = await seed_initial_data(db)
    return result

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from fastapi import HTTPException

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith("api") or full_path in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail="Not Found")
        
        file_path = FRONTEND_DIST / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
            
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return RedirectResponse(url="/docs")
