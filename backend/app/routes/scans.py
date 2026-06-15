from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.scan import ScanJob, ScanRequest, ScanResultOut, JobStatus
from app.schemas.activity import ActivityLogOut
from app.services.scan_service import ScanService, _active_scans
from app.services.attack_library import ATTACK_TEMPLATES
from app.schemas.attack import AttackTemplate

router = APIRouter(tags=["scans"])


@router.post("/api/v1/resources/{resource_id}/scan", response_model=ScanJob, status_code=202)
async def start_scan(
    resource_id: int,
    request: Optional[ScanRequest] = None,
    db: Session = Depends(get_db),
):
    svc = ScanService(db)
    try:
        return await svc.start_scan(resource_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/v1/resources/{resource_id}/scans", response_model=list[ScanResultOut])
def list_scans(resource_id: int, db: Session = Depends(get_db)):
    svc = ScanService(db)
    return svc.list_scans(resource_id)


@router.get("/api/v1/resources/{resource_id}/activity", response_model=list[ActivityLogOut])
def get_resource_activity(resource_id: int, db: Session = Depends(get_db)):
    svc = ScanService(db)
    return svc.get_resource_activity(resource_id)


@router.get("/api/v1/scans/{scan_id}", response_model=ScanResultOut)
def get_scan(scan_id: int, db: Session = Depends(get_db)):
    svc = ScanService(db)
    scan = svc.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/api/v1/findings", response_model=list[ScanResultOut])
def list_findings(
    severity: Optional[str] = Query(None),
    limit: Optional[int] = Query(50),
    db: Session = Depends(get_db),
):
    svc = ScanService(db)
    return svc.list_findings(severity=severity, limit=limit)


@router.get("/api/v1/activity", response_model=list[ActivityLogOut])
def list_activity(
    limit: int = Query(50),
    db: Session = Depends(get_db),
):
    svc = ScanService(db)
    return svc.list_activity(limit=limit)


@router.get("/api/v1/attack-templates", response_model=list[AttackTemplate])
def list_attack_templates():
    return ATTACK_TEMPLATES
