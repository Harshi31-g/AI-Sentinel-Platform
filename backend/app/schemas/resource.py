from typing import Optional
from datetime import datetime
from app.schemas.base import CamelModel


class ResourceCreate(CamelModel):
    account_name: str
    resource_name: str
    webhook_id: str
    encryption_key: Optional[str] = None
    user_id: str
    description: Optional[str] = None


class ResourceOut(CamelModel):
    id: int
    account_name: str
    resource_name: str
    webhook_id: str
    user_id: str
    description: Optional[str] = None
    validation_status: str
    last_validated: Optional[datetime] = None
    created_at: datetime
    security_score: Optional[float] = None
    risk_level: Optional[str] = None
    last_scan_at: Optional[datetime] = None
    avg_latency_ms: Optional[float] = None
    total_scans: Optional[int] = None
    total_findings: Optional[int] = None


class ValidationResult(CamelModel):
    success: bool
    message: str
    resource_id: int
    metadata: Optional[dict] = None
