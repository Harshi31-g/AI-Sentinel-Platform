from typing import Optional, List
from datetime import datetime
from app.schemas.base import CamelModel


class ScanRequest(CamelModel):
    attack_ids: Optional[List[str]] = None


class ScanJob(CamelModel):
    job_id: str
    resource_id: int
    status: str
    started_at: datetime
    estimated_duration_ms: Optional[int] = None


class ScanResultOut(CamelModel):
    id: int
    resource_id: int
    vulnerability_id: Optional[str] = None
    attack_id: str
    attack_name: Optional[str] = None
    prompt: str
    response: str
    severity: str
    risk_score: int
    latency_ms: Optional[int] = None
    status: str
    findings: Optional[List[str]] = None
    created_at: datetime
