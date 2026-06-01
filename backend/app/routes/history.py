from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models import Generation

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("")
async def list_generations(db: AsyncSession = Depends(get_db)):
    """List all past generations (summary only — no full content)"""
    result = await db.execute(
        select(Generation.id, Generation.title, Generation.mode,
               Generation.status, Generation.created_at)
        .order_by(Generation.created_at.desc())
    )
    return [dict(row._mapping) for row in result.all()]

@router.get("/{generation_id}")
async def get_generation(generation_id: str, db: AsyncSession = Depends(get_db)):
    """Get full generation details including report, quizzes, etc."""
    result = await db.execute(select(Generation).where(Generation.id == generation_id))
    gen = result.scalar_one_or_none()
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
    return gen

@router.delete("/{generation_id}")
async def delete_generation(generation_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a generation from history"""
    await db.execute(delete(Generation).where(Generation.id == generation_id))
    await db.commit()
    return {"status": "deleted"}
