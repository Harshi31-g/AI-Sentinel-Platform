from typing import List
from app.schemas.base import CamelModel


class TrendPoint(CamelModel):
    date: str
    value: float


class DashboardSummary(CamelModel):
    connected_agents: int
    validated_resources: int
    active_scans: int
    total_findings: int
    avg_latency_ms: float
    security_score: float
    success_rate: float
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int


class SecurityTrends(CamelModel):
    score_history: List[TrendPoint]
    scan_volume: List[TrendPoint]
    latency_trend: List[TrendPoint]


class VulnCategory(CamelModel):
    category: str
    count: int
    percentage: float
