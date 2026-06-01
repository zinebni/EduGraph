import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, CheckConstraint
from app.database import Base

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, default=1)
    google_api_key = Column(Text, nullable=True)
    tavily_api_key = Column(Text, nullable=True)
    default_model = Column(String(50), default="gemini-3.1-flash-lite")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (CheckConstraint("id = 1", name="single_row"),)

class Generation(Base):
    __tablename__ = "generations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    mode = Column(String(20), nullable=False)
    input_data = Column(Text, nullable=False)
    curriculum_report = Column(Text, nullable=True)
    quizzes_data = Column(Text, nullable=True)
    search_results = Column(Text, nullable=True)
    status = Column(String(20), default="processing")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
