import jwt from "jsonwebtoken";
import { ZodError } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header." });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

export function signAuthToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed.",
      details: err.issues,
    });
  }

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "A record with this unique field already exists.",
      target: err.meta?.target || null,
    });
  }

  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error("Unhandled error:", err);
  }
  return res.status(statusCode).json({ error: err.message || "Internal server error." });
}
