FROM node:24-slim AS frontend-builder

WORKDIR /workspace
COPY package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/security-platform/ ./artifacts/security-platform/

RUN npm install -g pnpm && \
    pnpm config set only-built-dependencies esbuild && \
    pnpm install --no-frozen-lockfile && \
    pnpm --filter @workspace/api-spec run codegen && \
    cd artifacts/security-platform && \
    PORT=3000 BASE_PATH=/ pnpm run build


FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /workspace/artifacts/security-platform/dist ./artifacts/security-platform/dist

WORKDIR /app/backend

ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host ${HOST} --port ${PORT}"]
