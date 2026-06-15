from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from sqlalchemy.sql import func
from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(255), nullable=False)
    resource_name = Column(String(255), nullable=False)
    webhook_id = Column(String(512), nullable=False)
    encryption_key = Column(String(512), nullable=True)
    user_id = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    validation_status = Column(String(50), default="pending", nullable=False)
    last_validated = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
