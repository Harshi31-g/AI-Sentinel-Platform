import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PYTHON_API_URL = "http://localhost:8000";

// Proxy /api/v1/... → Python backend at http://localhost:8000/api/v1/...
// pathRewrite prepends /api back because Express strips the mount prefix
const pythonProxy = createProxyMiddleware({
  target: PYTHON_API_URL,
  changeOrigin: true,
  pathRewrite: (path) => `/api/v1${path}`,
  on: {
    error: (err, _req, res) => {
      logger.error({ err }, "Python API proxy error");
      if (res && "status" in res && typeof (res as any).status === "function") {
        (res as any).status(502).json({ error: "Python API unavailable", detail: "Backend service is starting up" });
      }
    },
  },
});

const pythonDocsProxy = createProxyMiddleware({
  target: PYTHON_API_URL,
  changeOrigin: true,
  on: {
    error: (err, _req, res) => {
      logger.error({ err }, "Python docs proxy error");
    },
  },
});

// Proxy Python API routes — must come before Node.js /api router
app.use("/api/v1", pythonProxy);
app.use("/api/docs", pythonDocsProxy);
app.use("/api/redoc", pythonDocsProxy);
app.use("/api/openapi.json", pythonDocsProxy);

// Node.js routes (healthz, etc.)
app.use("/api", router);

export default app;
