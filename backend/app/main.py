from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.routes import (
    health_router,
    challenge_router,
    policy_router,
    verify_router,
    crypto_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    init_db()
    yield

app = FastAPI(
    title="zkode Backend Core",
    description="Privacy-Preserving Eligibility Verification Platform & Agentic Statutory Policy Compiler",
    version="2.1.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(challenge_router)
app.include_router(policy_router)
app.include_router(verify_router)
app.include_router(crypto_router)

@app.get("/")
def root():
    return {
        "service": "zkode-backend",
        "version": "2.1.0",
        "status": "operational",
        "docs": "/docs"
    }

