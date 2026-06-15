from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.resource import ResourceCreate, ResourceOut, ValidationResult
from app.services.resource_service import ResourceService

router = APIRouter(prefix="/api/v1/resources", tags=["resources"])


@router.get("", response_model=list[ResourceOut])
def list_resources(db: Session = Depends(get_db)):
    svc = ResourceService(db)
    return svc.list_resources()


@router.post("", response_model=ResourceOut, status_code=201)
def create_resource(data: ResourceCreate, db: Session = Depends(get_db)):
    svc = ResourceService(db)
    return svc.create_resource(data)


@router.get("/{resource_id}", response_model=ResourceOut)
def get_resource(resource_id: int, db: Session = Depends(get_db)):
    svc = ResourceService(db)
    resource = svc.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.delete("/{resource_id}", status_code=204)
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    svc = ResourceService(db)
    if not svc.delete_resource(resource_id):
        raise HTTPException(status_code=404, detail="Resource not found")


@router.post("/{resource_id}/validate", response_model=ValidationResult)
async def validate_resource(resource_id: int, db: Session = Depends(get_db)):
    svc = ResourceService(db)
    try:
        return await svc.validate_resource(resource_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
