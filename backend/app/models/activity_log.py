from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, nullable=True, index=True)
    event_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
