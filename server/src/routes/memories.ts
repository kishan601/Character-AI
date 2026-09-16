import { Router } from "express";
import { prisma } from "../db.js";

export const memoriesRouter = Router();

// GET pinned memories
memoriesRouter.get("/", async (req, res, next) => {
  try {
    const { characterId, sessionId } = req.query;
    if (!characterId) {
      res.status(400).json({ error: "characterId query parameter is required" });
      return;
    }

    const memories = await prisma.pinnedMemory.findMany({
      where: {
        characterId: String(characterId),
        OR: sessionId
          ? [{ sessionId: String(sessionId) }, { sessionId: null }]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(memories);
  } catch (err) {
    next(err);
  }
});

// POST pin new memory
memoriesRouter.post("/", async (req, res, next) => {
  try {
    const { characterId, sessionId, content, label } = req.body;

    if (!characterId || !content) {
      res.status(400).json({ error: "characterId and content are required." });
      return;
    }

    const memory = await prisma.pinnedMemory.create({
      data: {
        characterId,
        sessionId: sessionId || null,
        content: content.trim(),
        label: label?.trim() || null,
      },
    });

    res.status(201).json(memory);
  } catch (err) {
    next(err);
  }
});

// DELETE unpin memory
memoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.pinnedMemory.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
