from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Settings
from pydantic import BaseModel

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsResponse(BaseModel):
    google_api_key_set: bool      # True if key exists (never expose the actual key)
    tavily_api_key_set: bool
    default_model: str

class SettingsUpdate(BaseModel):
    google_api_key: str | None = None
    tavily_api_key: str | None = None
    default_model: str | None = None

@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get current settings (keys are masked — only returns whether they're set)"""
    result = await db.execute(select(Settings))
    settings = result.scalar_one_or_none()
    if not settings:
        return SettingsResponse(google_api_key_set=False, tavily_api_key_set=False, default_model="gemini-3.1-flash-lite")
    return SettingsResponse(
        google_api_key_set=bool(settings.google_api_key),
        tavily_api_key_set=bool(settings.tavily_api_key),
        default_model=settings.default_model or "gemini-3.1-flash-lite",
    )

@router.put("")
async def update_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    """Update API keys and settings"""
    result = await db.execute(select(Settings))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
    if data.google_api_key is not None:
        settings.google_api_key = data.google_api_key
    if data.tavily_api_key is not None:
        settings.tavily_api_key = data.tavily_api_key
    if data.default_model is not None:
        settings.default_model = data.default_model
    await db.commit()
    return {"status": "ok"}
