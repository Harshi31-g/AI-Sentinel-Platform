from app.schemas.base import CamelModel


class AttackTemplate(CamelModel):
    id: str
    name: str
    description: str
    category: str
    prompt: str
    severity: str
