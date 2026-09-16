import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { healthRouter } from "./routes/health.js";
import { uploadRouter } from "./routes/upload.js";
import { charactersRouter } from "./routes/characters.js";
import { personasRouter } from "./routes/personas.js";
import { sessionsRouter } from "./routes/sessions.js";
import { messagesRouter } from "./routes/messages.js";
import { memoriesRouter } from "./routes/memories.js";
import { generationRouter } from "./routes/generation.js";

const app = express();

// Disable HTTP ETags to prevent unwanted 304 Not Modified cache responses on dynamic API requests
app.set("etag", false);

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Prevent browser caching on dynamic API routes & measure response latency
app.use("/api", (req, res, next) => {
  const start = performance.now();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args: any[]) {
    if (!res.headersSent) {
      const duration = Math.round(performance.now() - start);
      res.setHeader("X-Response-Time", `${duration}ms`);
    }
    return (originalWriteHead as any).apply(this, args);
  };

  res.on("finish", () => {
    const duration = Math.round(performance.now() - start);
    console.log(`⚡ [API] ${req.method} ${req.originalUrl} → ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Static file serving for uploads
app.use("/uploads", express.static(config.uploadDir));

// API Routes
app.use("/api/health", healthRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/characters", charactersRouter);
app.use("/api/personas", personasRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/memories", memoriesRouter);
app.use("/api/generate", generationRouter);

// Global Error Handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 Character.ai Server running at http://localhost:${config.port}`);
  console.log(`📡 LM Studio URL: ${config.lmStudioUrl}`);
  console.log(`📁 Static uploads served at http://localhost:${config.port}/uploads`);
  console.log(`=========================================`);
});
