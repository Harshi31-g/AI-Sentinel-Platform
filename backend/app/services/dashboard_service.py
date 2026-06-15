from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.resource import Resource
from app.models.scan_result import ScanResult
from app.models.activity_log import ActivityLog
from app.schemas.dashboard import DashboardSummary, SecurityTrends, VulnCategory, TrendPoint
from app.services.security_engine import calculate_risk_score


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_summary(self) -> DashboardSummary:
        total_resources = self.db.query(Resource).count()
        validated = self.db.query(Resource).filter(Resource.validation_status == "valid").count()

        scans = self.db.query(ScanResult).all()
        total_findings_with_content = [s for s in scans if s.findings]

        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        latencies = []
        successful = 0

        for s in scans:
            sev = s.severity
            if sev in severity_counts:
                severity_counts[sev] += 1
            if s.latency_ms:
                latencies.append(s.latency_ms)
            if s.status == "completed":
                successful += 1

        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
        success_rate = (successful / len(scans) * 100) if scans else 100.0
        total_findings = sum(len(s.findings or []) for s in scans if s.findings)

        security_score = float(calculate_risk_score(
            critical=severity_counts["critical"],
            high=severity_counts["high"],
            medium=severity_counts["medium"],
            low=severity_counts["low"],
        )) if scans else 100.0

        return DashboardSummary(
            connected_agents=total_resources,
            validated_resources=validated,
            active_scans=0,
            total_findings=total_findings,
            avg_latency_ms=round(avg_latency, 1),
            security_score=round(security_score, 1),
            success_rate=round(success_rate, 1),
            critical_count=severity_counts["critical"],
            high_count=severity_counts["high"],
            medium_count=severity_counts["medium"],
            low_count=severity_counts["low"],
        )

    def get_trends(self) -> SecurityTrends:
        now = datetime.now(timezone.utc)
        days = 14
        score_history: list[TrendPoint] = []
        scan_volume: list[TrendPoint] = []
        latency_trend: list[TrendPoint] = []

        for i in range(days, -1, -1):
            date = now - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_scans = (
                self.db.query(ScanResult)
                .filter(
                    ScanResult.created_at >= day_start,
                    ScanResult.created_at < day_end,
                )
                .all()
            )

            scan_count = len(day_scans)
            scan_volume.append(TrendPoint(date=date_str, value=float(scan_count)))

            if day_scans:
                sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
                lats = []
                for s in day_scans:
                    if s.severity in sev_counts:
                        sev_counts[s.severity] += 1
                    if s.latency_ms:
                        lats.append(s.latency_ms)

                day_score = calculate_risk_score(
                    critical=sev_counts["critical"],
                    high=sev_counts["high"],
                    medium=sev_counts["medium"],
                    low=sev_counts["low"],
                )
                avg_lat = sum(lats) / len(lats) if lats else 0.0
            else:
                day_score = 100
                avg_lat = 0.0

            score_history.append(TrendPoint(date=date_str, value=float(day_score)))
            latency_trend.append(TrendPoint(date=date_str, value=round(avg_lat, 1)))

        return SecurityTrends(
            score_history=score_history,
            scan_volume=scan_volume,
            latency_trend=latency_trend,
        )

    def get_vulnerability_distribution(self) -> list[VulnCategory]:
        scans = self.db.query(ScanResult).filter(ScanResult.findings != None).all()
        category_counts: dict[str, int] = {}

        for scan in scans:
            if scan.findings:
                for finding in scan.findings:
                    category_counts[finding] = category_counts.get(finding, 0) + 1

        total = sum(category_counts.values())
        if total == 0:
            return []

        return [
            VulnCategory(
                category=cat,
                count=count,
                percentage=round(count / total * 100, 1),
            )
            for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])
        ]
