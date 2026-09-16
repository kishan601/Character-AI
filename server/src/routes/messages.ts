import { Router } from "express";
import { prisma } from "../db.js";

export const messagesRouter = Router();

// Helper to normalize swipes to string[]
export function parseSwipes(swipes: any): string[] {
  if (Array.isArray(swipes)) return swipes;
  if (typeof swipes === "string") {
    try {
      return JSON.parse(swipes);
    } catch {
      return [swipes];
    }
  }
  return [];
}

// Helper to serialize swipes for saving
export function serializeSwipes(swipes: string[]): any {
  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
  if (isPostgres) {
    return swipes;
  }
  return JSON.stringify(swipes);
}

// GET messages for session
messagesRouter.get("/session/:sessionId", async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        sessionId: req.params.sessionId,
        isDeleted: false,
      },
      orderBy: { orderIndex: "asc" },
    });

    const normalized = messages.map((m) => ({
      ...m,
      swipes: parseSwipes(m.swipes),
    }));

    res.json(normalized);
  } catch (err) {
    next(err);
  }
});

// PUT edit message content
messagesRouter.put("/:id", async (req, res, next) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const currentSwipes = parseSwipes(message.swipes);
    const activeIdx = message.activeSwipeIndex || 0;
    currentSwipes[activeIdx] = content.trim();

    // 1. Update the message
    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: {
        swipes: serializeSwipes(currentSwipes),
      },
    });

    // 2. Lazy memory invalidation: if edited message was already summarized, reset summary boundary
    await prisma.chatSession.updateMany({
      where: {
        id: message.sessionId,
        summarizedUpToIndex: { gte: message.orderIndex },
      },
      data: {
        summarizedUpToIndex: Math.max(0, message.orderIndex - 1),
        rollingSummary: null,
      },
    });

    res.json({
      message: { ...updated, swipes: currentSwipes },
      softDeletedCount: 0,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH switch active swipe
messagesRouter.patch("/:id/swipe", async (req, res, next) => {
  try {
    const { swipeIndex } = req.body;
    if (typeof swipeIndex !== "number") {
      res.status(400).json({ error: "swipeIndex (number) is required" });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const swipes = parseSwipes(message.swipes);
    if (swipeIndex < 0 || swipeIndex >= swipes.length) {
      res.status(400).json({ error: "Invalid swipe index" });
      return;
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: {
        activeSwipeIndex: swipeIndex,
      },
    });

    // Lazy memory invalidation: if swiped message was already summarized, reset summary boundary
    await prisma.chatSession.updateMany({
      where: {
        id: message.sessionId,
        summarizedUpToIndex: { gte: message.orderIndex },
      },
      data: {
        summarizedUpToIndex: Math.max(0, message.orderIndex - 1),
        rollingSummary: null,
      },
    });

    res.json({ ...updated, swipes });
  } catch (err) {
    next(err);
  }
});

// POST batch soft-delete messages
messagesRouter.post("/batch-delete", async (req, res, next) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({ error: "messageIds array is required" });
      return;
    }

    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
      },
      data: {
        isDeleted: true,
      },
    });

    res.json({ success: true, count: result.count });
  } catch (err) {
    next(err);
  }
});

// DELETE soft-delete a message
messagesRouter.delete("/:id", async (req, res, next) => {
  try {
    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { isDeleted: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
