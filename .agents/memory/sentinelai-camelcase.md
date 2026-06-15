---
name: SentinelAI CamelCase Serialization
description: How Python FastAPI is configured to output camelCase JSON matching the OpenAPI spec
---

FastAPI by default outputs snake_case. The frontend (generated from OpenAPI spec) expects camelCase.

**Solution:** Two-part fix:

1. `backend/app/schemas/base.py` — `CamelModel` base class with `alias_generator=to_camel` and `populate_by_name=True`
2. `backend/app/main.py` — `CamelJSONResponse` custom response class calls `model.model_dump(by_alias=True, mode="json")` so aliases are used in output

**Why:** FastAPI's `response_model` serialization doesn't use aliases by default. Custom response class is the cleanest global solution without touching every route.

**How to apply:** All new Pydantic schemas must extend `CamelModel` from `app.schemas.base`. Tests must use camelCase keys when asserting on response JSON.
