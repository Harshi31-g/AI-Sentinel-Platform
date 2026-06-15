from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON
from sqlalchemy.sql import func
from app.database import Base


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, nullable=False, index=True)
    vulnerability_id = Column(String(255), nullable=True)
    attack_id = Column(String(255), nullable=False)
    attack_name = Column(String(255), nullable=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)
    risk_score = Column(Integer, nullable=False, default=0)
    latency_ms = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="completed")
    findings = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
