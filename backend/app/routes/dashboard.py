from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.dashboard import DashboardSummary, SecurityTrends, VulnCategory
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    svc = DashboardService(db)
    return svc.get_summary()


@router.get("/trends", response_model=SecurityTrends)
def get_security_trends(db: Session = Depends(get_db)):
    svc = DashboardService(db)
    return svc.get_trends()


@router.get("/vulnerability-distribution", response_model=list[VulnCategory])
def get_vulnerability_distribution(db: Session = Depends(get_db)):
    svc = DashboardService(db)
    return svc.get_vulnerability_distribution()
