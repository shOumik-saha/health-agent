import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import router from "./routes.js";
import { errorHandler, notFoundHandler } from "./middleware.js";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOriginResolver = (origin, callback) => {
  // Non-browser requests (e.g. curl, health checks) can pass without Origin.
  if (!origin) {
    callback(null, true);
    return;
  }

  const normalizedOrigin = origin.replace(/\/$/, "");
  if (!allowedOrigins.length || allowedOrigins.includes(normalizedOrigin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${origin}`));
};

app.use(
  cors({
    origin: corsOriginResolver,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "health-agent-server",
    apiBase: "/api",
    healthEndpoint: "/api/health",
  });
});

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Health agent server running on http://localhost:${PORT}`);
});
