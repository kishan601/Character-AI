import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  lmStudioUrl: (process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1").replace(/\/$/, ""),
  uploadDir: path.resolve(process.cwd(), "uploads"),
  avatarDir: path.resolve(process.cwd(), "uploads", "avatars"),
  wallpaperDir: path.resolve(process.cwd(), "uploads", "wallpapers"),
  defaultMaxTokens: 400,
  defaultContextLimit: 8192,
  summaryThreshold: 10,
  summaryBatchSize: 8,
};
