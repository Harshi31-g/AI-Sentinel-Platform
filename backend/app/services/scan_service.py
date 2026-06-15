import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models.resource import Resource
from app.models.scan_result import ScanResult
from app.models.activity_log import ActivityLog
from app.schemas.scan import ScanJob, ScanRequest, ScanResultOut
from app.schemas.activity import ActivityLogOut
from app.connector.botpress import BotpressScanner, BotpressError, BotpressTimeoutError
from app.services.security_engine import SecurityAnalysisEngine
from app.services.attack_library import ATTACK_TEMPLATES, get_attack_template
import structlog

logger = structlog.get_logger(__name__)

_active_scans: dict[str, dict] = {}
engine = SecurityAnalysisEngine()


class ScanService:
    def __init__(self, db: Session):
        self.db = db

    def list_scans(self, resource_id: int) -> list[ScanResultOut]:
        scans = (
            self.db.query(ScanResult)
            .filter(ScanResult.resource_id == resource_id)
            .order_by(ScanResult.created_at.desc())
            .all()
        )
        return [ScanResultOut.model_validate(s) for s in scans]

    def get_scan(self, scan_id: int) -> Optional[ScanResultOut]:
        scan = self.db.query(ScanResult).filter(ScanResult.id == scan_id).first()
        if not scan:
            return None
        return ScanResultOut.model_validate(scan)

    def list_findings(
        self,
        severity: Optional[str] = None,
        limit: Optional[int] = 50,
    ) -> list[ScanResultOut]:
        q = self.db.query(ScanResult).filter(ScanResult.findings != None)
        if severity:
            q = q.filter(ScanResult.severity == severity)
        q = q.order_by(ScanResult.created_at.desc())
        if limit:
            q = q.limit(limit)
        return [ScanResultOut.model_validate(s) for s in q.all()]

    def get_resource_activity(self, resource_id: int) -> list[ActivityLogOut]:
        logs = (
            self.db.query(ActivityLog)
            .filter(ActivityLog.resource_id == resource_id)
            .order_by(ActivityLog.created_at.desc())
            .limit(50)
            .all()
        )
        resource = self.db.query(Resource).filter(Resource.id == resource_id).first()
        result = []
        for log in logs:
            out = ActivityLogOut.model_validate(log)
            if resource:
                out = out.model_copy(update={"resource_name": resource.resource_name})
            result.append(out)
        return result

    def list_activity(self, limit: int = 50) -> list[ActivityLogOut]:
        logs = (
            self.db.query(ActivityLog)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
            .all()
        )
        resource_map: dict[int, str] = {}
        resource_ids = {log.resource_id for log in logs if log.resource_id}
        if resource_ids:
            resources = self.db.query(Resource).filter(Resource.id.in_(resource_ids)).all()
            resource_map = {r.id: r.resource_name for r in resources}

        result = []
        for log in logs:
            out = ActivityLogOut.model_validate(log)
            if log.resource_id and log.resource_id in resource_map:
                out = out.model_copy(update={"resource_name": resource_map[log.resource_id]})
            result.append(out)
        return result

    async def start_scan(
        self,
        resource_id: int,
        request: Optional[ScanRequest] = None,
    ) -> ScanJob:
        resource = self.db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            raise ValueError(f"Resource {resource_id} not found")

        if resource.validation_status != "valid":
            raise ValueError(f"Resource must be validated before scanning")

        attack_ids = (request.attack_ids if request and request.attack_ids else None) or [t.id for t in ATTACK_TEMPLATES]

        job_id = str(uuid.uuid4())
        started_at = datetime.now(timezone.utc)
        estimated_ms = len(attack_ids) * 8000

        _active_scans[job_id] = {
            "resource_id": resource_id,
            "status": "running",
            "started_at": started_at,
            "attack_ids": attack_ids,
        }

        self._log_activity(
            resource_id=resource_id,
            event_type="scan_started",
            message=f"Security scan started on '{resource.resource_name}' with {len(attack_ids)} attack vectors",
        )

        asyncio.create_task(
            self._execute_scan_background(
                job_id=job_id,
                resource=resource,
                attack_ids=attack_ids,
            )
        )

        return ScanJob(
            job_id=job_id,
            resource_id=resource_id,
            status="running",
            started_at=started_at,
            estimated_duration_ms=estimated_ms,
        )

    async def _execute_scan_background(
        self,
        job_id: str,
        resource: Resource,
        attack_ids: list[str],
    ):
        scanner = BotpressScanner(
            webhook_id=resource.webhook_id,
            encryption_key=resource.encryption_key,
            timeout_seconds=20.0,
            poll_interval_seconds=1.5,
            max_retries=2,
        )

        from app.database import SessionLocal
        db = SessionLocal()

        try:
            await scanner.validate_target()
            critical_count = 0
            high_count = 0

            for attack_id in attack_ids:
                template = get_attack_template(attack_id)
                if not template:
                    continue

                try:
                    result = await scanner.execute_test(template.prompt)
                    response_text = result["response"]
                    latency_ms = result["latency_ms"]
                    status = "completed"
                except BotpressTimeoutError:
                    response_text = "[TIMEOUT] No response received within deadline"
                    latency_ms = None
                    status = "timeout"
                    self._log_activity_db(
                        db=db,
                        resource_id=resource.id,
                        event_type="bot_timeout",
                        message=f"Bot timeout during '{template.name}' attack on '{resource.resource_name}'",
                        severity="medium",
                    )
                except BotpressError as e:
                    response_text = f"[ERROR] {str(e)}"
                    latency_ms = None
                    status = "failed"

                analysis = engine.analyze(
                    prompt=template.prompt,
                    response=response_text,
                    attack_id=attack_id,
                )

                if analysis.severity == "critical":
                    critical_count += 1
                elif analysis.severity == "high":
                    high_count += 1

                scan = ScanResult(
                    resource_id=resource.id,
                    vulnerability_id=analysis.vulnerability_id,
                    attack_id=attack_id,
                    attack_name=template.name,
                    prompt=template.prompt,
                    response=response_text,
                    severity=analysis.severity,
                    risk_score=analysis.risk_score,
                    latency_ms=latency_ms,
                    status=status,
                    findings=analysis.findings,
                )
                db.add(scan)
                db.commit()

                if analysis.findings:
                    self._log_activity_db(
                        db=db,
                        resource_id=resource.id,
                        event_type="finding_detected",
                        message=f"[{analysis.severity.upper()}] {template.name}: {', '.join(analysis.findings)} detected on '{resource.resource_name}'",
                        severity=analysis.severity,
                    )

                try:
                    await scanner.reset_conversation()
                except BotpressError:
                    pass

            self._log_activity_db(
                db=db,
                resource_id=resource.id,
                event_type="scan_completed",
                message=f"Scan completed on '{resource.resource_name}': {critical_count} critical, {high_count} high findings",
            )

            _active_scans[job_id]["status"] = "completed"

        except Exception as e:
            logger.error("scan_background_error", job_id=job_id, error=str(e))
            _active_scans[job_id]["status"] = "failed"
            self._log_activity_db(
                db=db,
                resource_id=resource.id,
                event_type="scan_failed",
                message=f"Scan failed on '{resource.resource_name}': {str(e)}",
                severity="high",
            )
        finally:
            db.close()

    def _log_activity(
        self,
        resource_id: int,
        event_type: str,
        message: str,
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

    def _log_activity_db(
        self,
        db: Session,
        resource_id: int,
        event_type: str,
        message: str,
        severity: Optional[str] = None,
    ):
        log = ActivityLog(
            resource_id=resource_id,
            event_type=event_type,
            message=message,
            severity=severity,
        )
        db.add(log)
        db.commit()
