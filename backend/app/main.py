from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import settings, history, generate
from app.database import init_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()  # Create tables on startup
    yield

app = FastAPI(title="EduGraph API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Simplified for smooth dev environment setup
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(settings.router)
app.include_router(history.router)

# WebSocket route
app.include_router(generate.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "agents": [
        "team_supervisor", "syllabus_reader_agent", "search_agent",
        "curriculum_writer_agent", "quiz_exercise_agent"
    ]}

@app.get("/api/sample-syllabus")
async def get_sample_syllabus():
    import json
    from pathlib import Path
    path = Path(__file__).parent.parent / "data" / "sample_syllabus.json"
    return json.loads(path.read_text())
