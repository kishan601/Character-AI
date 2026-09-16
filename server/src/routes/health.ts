import { Router } from "express";
import { lmStudioClient } from "../services/lmStudioClient.js";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

healthRouter.get("/lm-studio", async (req, res) => {
  const health = await lmStudioClient.checkHealth();
  res.json(health);
});
