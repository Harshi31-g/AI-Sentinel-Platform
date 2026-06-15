from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.models.resource import Resource
from app.models.scan_result import ScanResult
from app.models.activity_log import ActivityLog
from app.schemas.resource import ResourceCreate, ResourceOut, ValidationResult
from app.connector.botpress import BotpressScanner, BotpressError
import structlog

logger = structlog.get_logger(__name__)


class ResourceService:
    def __init__(self, db: Session):
        self.db = db

    def list_resources(self) -> list[ResourceOut]:
        resources = self.db.query(Resource).order_by(Resource.created_at.desc()).all()
        result = []
        for r in resources:
            out = self._enrich_resource(r)
            result.append(out)
        return result

    def get_resource(self, resource_id: int) -> Optional[ResourceOut]:
        r = self.db.query(Resource).filter(Resource.id == resource_id).first()
        if not r:
            return None
        return self._enrich_resource(r)

    def create_resource(self, data: ResourceCreate) -> ResourceOut:
        resource = Resource(
            account_name=data.account_name,
            resource_name=data.resource_name,
            webhook_id=data.webhook_id,
            encryption_key=data.encryption_key,
            user_id=data.user_id,
            description=data.description,
            validation_status="pending",
        )
        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)

        self._log_activity(
            resource_id=resource.id,
            event_type="resource_created",
            message=f"Resource '{resource.resource_name}' created in account '{resource.account_name}'",
        )

        return self._enrich_resource(resource)

    def delete_resource(self, resource_id: int) -> bool:
        resource = self.db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            return False

        self.db.query(ScanResult).filter(ScanResult.resource_id == resource_id).delete()
        self.db.query(ActivityLog).filter(ActivityLog.resource_id == resource_id).delete()
        self.db.delete(resource)
        self.db.commit()
        return True

    async def validate_resource(self, resource_id: int) -> ValidationResult:
        resource = self.db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            raise ValueError(f"Resource {resource_id} not found")

        scanner = BotpressScanner(
            webhook_id=resource.webhook_id,
            encryption_key=resource.encryption_key,
            timeout_seconds=15.0,
        )

        try:
            result = await scanner.validate_target()
            resource.validation_status = "valid"
            resource.last_validated = datetime.now(timezone.utc)
            self.db.commit()

            self._log_activity(
                resource_id=resource_id,
                event_type="validation_success",
                message=f"Resource '{resource.resource_name}' validated successfully",
            )

            return ValidationResult(
                success=True,
                message="Webhook validated successfully",
                resource_id=resource_id,
                metadata={
                    "conversation_id": result.get("conversation_id"),
                    "platform": "Botpress",
                },
            )

        except BotpressError as e:
            resource.validation_status = "invalid"
            self.db.commit()

            self._log_activity(
                resource_id=resource_id,
                event_type="validation_failed",
                message=f"Validation failed for '{resource.resource_name}': {str(e)}",
                severity="high",
            )

            return ValidationResult(
                success=False,
                message=str(e),
                resource_id=resource_id,
            )

    def _enrich_resource(self, r: Resource) -> ResourceOut:
        """Compute aggregate fields for a resource."""
        scans = self.db.query(ScanResult).filter(ScanResult.resource_id == r.id).all()

        total_scans = len(scans)
        findings = [s for s in scans if s.findings]
        total_findings = sum(len(s.findings or []) for s in scans)

        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        latencies = []
        last_scan_at = None

        for s in scans:
            sev = s.severity
            if sev in severity_counts:
                severity_counts[sev] += 1
            if s.latency_ms:
                latencies.append(s.latency_ms)
            if last_scan_at is None or s.created_at > last_scan_at:
                last_scan_at = s.created_at

        from app.services.security_engine import calculate_risk_score
        security_score = float(calculate_risk_score(
            critical=severity_counts["critical"],
            high=severity_counts["high"],
            medium=severity_counts["medium"],
            low=severity_counts["low"],
        )) if total_scans > 0 else None

        risk_level = None
        if security_score is not None:
            if security_score < 40:
                risk_level = "critical"
            elif security_score < 60:
                risk_level = "high"
            elif security_score < 80:
                risk_level = "medium"
            else:
                risk_level = "low"

        avg_latency_ms = sum(latencies) / len(latencies) if latencies else None

        return ResourceOut(
            id=r.id,
            account_name=r.account_name,
            resource_name=r.resource_name,
            webhook_id=r.webhook_id,
            user_id=r.user_id,
            description=r.description,
            validation_status=r.validation_status,
            last_validated=r.last_validated,
            created_at=r.created_at,
            security_score=security_score,
            risk_level=risk_level,
            last_scan_at=last_scan_at,
            avg_latency_ms=avg_latency_ms,
            total_scans=total_scans,
            total_findings=total_findings,
        )

    def _log_activity(
        self,
        event_type: str,
        message: str,
        resource_id: Optional[int] = None,
        severity: Optional[str] = None,
    ):
        log = ActivityLog(
            resource_id=resource_id,
            event_type=event_type,
            message=message,
            severity=severity,
        )
        self.db.add(log)
        self.db.commit()
