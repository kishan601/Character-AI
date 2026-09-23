import { Router } from "express";
import { prisma } from "../db.js";
import { interpolateMacros } from "../services/contextEngine.js";
import { serializeSwipes } from "./messages.js";
import { memoryService } from "../services/memory.js";

export const sessionsRouter = Router();

// GET sessions (optionally filtered by characterId)
sessionsRouter.get("/", async (req, res, next) => {
  try {
    const { characterId } = req.query;
    const sessions = await prisma.chatSession.findMany({
      where: characterId ? { characterId: String(characterId) } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        character: {
          select: { id: true, name: true, avatarUrl: true, backgroundUrl: true },
        },
        userPersona: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: { select: { messages: true } },
      },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// GET single session with full data
sessionsRouter.get("/:id", async (req, res, next) => {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      include: {
        character: true,
        userPersona: true,
        memories: { orderBy: { createdAt: "desc" } },
        _count: { select: { messages: { where: { isDeleted: false } } } },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST create new chat session
sessionsRouter.post("/", async (req, res, next) => {
  try {
    const { characterId, userPersonaId, preferredMaxTokens } = req.body;

    if (!characterId) {
      res.status(400).json({ error: "characterId is required" });
      return;
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      res.status(404).json({ error: "Character not found" });
      return;
    }

    // Lookup active user persona (or default if not passed)
    let activePersonaId = userPersonaId;
    let personaName = "User";
    if (activePersonaId) {
      const p = await prisma.userPersona.findUnique({
        where: { id: activePersonaId },
      });
      if (p) personaName = p.name;
    } else {
      const defaultPersona = await prisma.userPersona.findFirst({
        where: { isDefault: true },
      });
      if (defaultPersona) {
        activePersonaId = defaultPersona.id;
        personaName = defaultPersona.name;
      }
    }

    const session = await prisma.chatSession.create({
      data: {
        characterId,
        userPersonaId: activePersonaId || null,
        title: `Chat with ${character.name}`,
        preferredMaxTokens: preferredMaxTokens || 400,
      },
    });

    // Create initial greeting turn as message orderIndex 0
    const processedGreeting = interpolateMacros(
      character.greeting,
      character.name,
      personaName
    );

    await prisma.message.create({
      data: {
        sessionId: session.id,
        sender: "assistant",
        orderIndex: 0,
        swipes: serializeSwipes([processedGreeting]),
        activeSwipeIndex: 0,
      },
    });

    // Return complete session
    const fullSession = await prisma.chatSession.findUnique({
      where: { id: session.id },
      include: {
        character: true,
        userPersona: true,
        messages: { orderBy: { orderIndex: "asc" } },
        memories: true,
      },
    });

    res.status(201).json(fullSession);
  } catch (err) {
    next(err);
  }
});

// PATCH update session
sessionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { title, userPersonaId, preferredMaxTokens, rollingSummary } = req.body;

    const session = await prisma.chatSession.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title : undefined,
        userPersonaId: userPersonaId !== undefined ? userPersonaId : undefined,
        preferredMaxTokens:
          typeof preferredMaxTokens === "number"
            ? preferredMaxTokens
            : undefined,
        rollingSummary:
          rollingSummary !== undefined ? rollingSummary : undefined,
      },
      include: {
        character: true,
        userPersona: true,
      },
    });

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// POST resume session (reverts to last active session or creates fresh one)
sessionsRouter.post("/resume", async (req, res, next) => {
  try {
    const { characterId, userPersonaId } = req.body;
    if (!characterId) {
      res.status(400).json({ error: "characterId is required" });
      return;
    }

    // 1. Check if there is an existing session for this character
    const existingSession = await prisma.chatSession.findFirst({
      where: { characterId },
      orderBy: { updatedAt: "desc" },
      include: {
        character: true,
        userPersona: true,
        messages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
        memories: true,
      },
    });

    if (existingSession) {
      res.json(existingSession);
      return;
    }

    // 2. No session exists yet: create a fresh one!
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      res.status(404).json({ error: "Character not found" });
      return;
    }

    let activePersonaId = userPersonaId;
    let personaName = "User";
    if (activePersonaId) {
      const p = await prisma.userPersona.findUnique({
        where: { id: activePersonaId },
      });
      if (p) personaName = p.name;
    } else {
      const defaultPersona = await prisma.userPersona.findFirst({
        where: { isDefault: true },
      });
      if (defaultPersona) {
        activePersonaId = defaultPersona.id;
        personaName = defaultPersona.name;
      }
    }

    const session = await prisma.chatSession.create({
      data: {
        characterId,
        userPersonaId: activePersonaId || null,
        title: `Chat with ${character.name}`,
        preferredMaxTokens: 400,
      },
    });

    const processedGreeting = interpolateMacros(
      character.greeting,
      character.name,
      personaName
    );

    await prisma.message.create({
      data: {
        sessionId: session.id,
        sender: "assistant",
        orderIndex: 0,
        swipes: serializeSwipes([processedGreeting]),
        activeSwipeIndex: 0,
      },
    });

    const fullSession = await prisma.chatSession.findUnique({
      where: { id: session.id },
      include: {
        character: true,
        userPersona: true,
        messages: { orderBy: { orderIndex: "asc" } },
        memories: true,
      },
    });

    res.status(201).json(fullSession);
  } catch (err) {
    next(err);
  }
});

// DELETE session
sessionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await prisma.chatSession.findUnique({
      where: { id },
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Delete associated messages and memories cleanly
    await prisma.message.deleteMany({
      where: { sessionId: id },
    });
    await prisma.pinnedMemory.deleteMany({
      where: { sessionId: id },
    });
    await prisma.chatSession.delete({
      where: { id },
    });

    res.status(200).json({ success: true, deletedId: id });
  } catch (err) {
    console.error("Failed to delete session:", err);
    next(err);
  }
});

// DELETE all sessions for a specific character
sessionsRouter.delete("/character/:characterId", async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const sessions = await prisma.chatSession.findMany({
      where: { characterId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await prisma.message.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await prisma.pinnedMemory.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await prisma.chatSession.deleteMany({
        where: { id: { in: sessionIds } },
      });
    }

    res.status(200).json({
      success: true,
      characterId,
      deletedSessionIds: sessionIds,
    });
  } catch (err) {
    console.error("Failed to delete sessions for character:", err);
    next(err);
  }
});

// GET session memory status
sessionsRouter.get("/:id/memory/status", async (req, res, next) => {
  try {
    const status = await memoryService.getStatus(req.params.id);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// POST trigger memory compaction
sessionsRouter.post("/:id/memory/compact", async (req, res, next) => {
  try {
    const result = await memoryService.compact(req.params.id, { force: true });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
