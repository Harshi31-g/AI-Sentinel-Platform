---
name: SentinelAI API Routing
description: How Python FastAPI backend routes are proxied through Node.js api-server to the frontend
---

The workspace proxy routes all `/api` traffic to the Node.js api-server (port 8080). Python FastAPI runs on port 8000.

**Solution:** `artifacts/api-server/src/app.ts` uses `http-proxy-middleware` to proxy `/api/v1` → Python backend.

```typescript
app.use("/api/v1", createProxyMiddleware({
  target: "http://localhost:8000",
  pathRewrite: (path) => `/api/v1${path}`,  // Express strips /api/v1 prefix, rewrite adds it back
}));
```

**Why pathRewrite is needed:** When Express mounts at `/api/v1`, it strips that prefix before passing to middleware. So `path` arriving at proxy is `/dashboard/summary`, not `/api/v1/dashboard/summary`. The rewrite adds the full prefix back.

**How to apply:** Any time Python API routes are modified, ensure the pathRewrite formula stays `/api/v1${path}`.
