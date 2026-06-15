from typing import Optional
from datetime import datetime
from app.schemas.base import CamelModel


class ActivityLogOut(CamelModel):
    id: int
    resource_id: Optional[int] = None
    resource_name: Optional[str] = None
    event_type: str
    message: str
    severity: Optional[str] = None
    created_at: datetime
