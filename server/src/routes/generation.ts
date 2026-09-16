import { Router } from "express";
import { prisma } from "../db.js";
import { lmStudioClient } from "../services/lmStudioClient.js";
import { assembleContext, sanitizeAssistantResponse } from "../services/contextEngine.js";
import { checkAndTriggerRollingSummary } from "../services/summarizer.js";
import { parseSwipes, serializeSwipes } from "./messages.js";
import {
  calculateJaccardSimilarity,
  hasDuplicateOpeningAction,
  logGenerationMetrics,
} from "../services/observability.js";

export const generationRouter = Router();

// POST /api/generate (SSE Streaming)
generationRouter.post("/", async (req, res, next) => {
  const { sessionId, userMessage, maxTokens, model } = req.body;

  if (!sessionId || !userMessage?.trim()) {
    res.status(400).json({ error: "sessionId and userMessage are required." });
    return;
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        character: true,
        userPersona: true,
        memories: true,
        messages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Chat session not found." });
      return;
    }

    // 1. Determine next orderIndex
    const lastMsg = session.messages[session.messages.length - 1];
    const userOrderIndex = (lastMsg ? lastMsg.orderIndex : -1) + 1;

    // 2. Save User Message
    const userMsg = await prisma.message.create({
      data: {
        sessionId,
        sender: "user",
        orderIndex: userOrderIndex,
        swipes: serializeSwipes([userMessage.trim()]),
        activeSwipeIndex: 0,
      },
    });

    const allMessagesForPrompt = [...session.messages, userMsg];

    // 3. Assemble Context
    const effectiveMaxTokens =
      typeof maxTokens === "number" ? maxTokens : session.preferredMaxTokens;

    if (typeof maxTokens === "number" && maxTokens !== session.preferredMaxTokens) {
      prisma.chatSession.update({
        where: { id: sessionId },
        data: { preferredMaxTokens: maxTokens },
      }).catch((e) => console.error("[Generation] Failed updating preferredMaxTokens:", e));
    }

    const { messages: compiledMessages } = assembleContext({
      character: session.character,
      userPersona: session.userPersona,
      pinnedMemories: session.memories,
      rollingSummary: session.rollingSummary,
      messages: allMessagesForPrompt,
      preferredMaxTokens: effectiveMaxTokens,
    });

    // 4. Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    // Send user message confirmation event first
    res.write(
      `data: ${JSON.stringify({
        type: "user_message",
        message: { ...userMsg, swipes: [userMessage.trim()] },
      })}\n\n`
    );

    const userName = session.userPersona?.name || "User";
    const charName = session.character.name;
    const stopTokens = [
      `\n${userName}:`,
      `\n\n${userName}:`,
      `\nUser:`,
      `\n\nUser:`,
      `\n{{user}}:`,
      `\n\n{{user}}:`,
    ];

    // 5. Stream from LM Studio
    let assistantFullText = "";
    const startTime = performance.now();

    try {
      assistantFullText = await lmStudioClient.streamChat({
        messages: compiledMessages,
        maxTokens: effectiveMaxTokens,
        model,
        stop: stopTokens,
        signal: abortController.signal,
        onToken: (token) => {
          res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
        },
      });
    } catch (streamErr: any) {
      if (abortController.signal.aborted) {
        console.log("[Generation] Stream aborted by client.");
        return;
      }
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: streamErr.message || "Failed during token generation stream",
        })}\n\n`
      );
      res.end();
      return;
    }

    const durationMs = Math.round(performance.now() - startTime);

    // 6. Sanitize and Save Assistant Response in DB
    const cleanedText = sanitizeAssistantResponse(assistantFullText, userName, charName);
    const assistantOrderIndex = userOrderIndex + 1;
    const assistantMsg = await prisma.message.create({
      data: {
        sessionId,
        sender: "assistant",
        orderIndex: assistantOrderIndex,
        swipes: serializeSwipes([cleanedText]),
        activeSwipeIndex: 0,
      },
    });

    logGenerationMetrics({
      sessionId,
      characterName: charName,
      orderIndex: assistantOrderIndex,
      isRegeneration: false,
      durationMs,
      promptLength: compiledMessages.reduce((sum, m) => sum + m.content.length, 0),
      outputLength: cleanedText.length,
    });

    // Send final completion message event
    res.write(
      `data: ${JSON.stringify({
        type: "done",
        message: { ...assistantMsg, swipes: [cleanedText] },
      })}\n\n`
    );
    res.end();

    // 7. Background: Async rolling summary check (non-blocking)
    checkAndTriggerRollingSummary(sessionId).catch((err) =>
      console.error("[Generation] Summary trigger error:", err)
    );
  } catch (err: any) {
    next(err);
  }
});

// POST /api/generate/continue (SSE Streaming - Story continuation without user prompt)
generationRouter.post("/continue", async (req, res, next) => {
  const { sessionId, maxTokens, model } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required." });
    return;
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        character: true,
        userPersona: true,
        memories: true,
        messages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Chat session not found." });
      return;
    }

    if (session.messages.length === 0) {
      res.status(400).json({ error: "Cannot continue a session with no messages." });
      return;
    }

    // 1. Determine next orderIndex
    const lastMsg = session.messages[session.messages.length - 1];
    const assistantOrderIndex = (lastMsg ? lastMsg.orderIndex : -1) + 1;

    // 2. Assemble Context
    const effectiveMaxTokens =
      typeof maxTokens === "number" ? maxTokens : session.preferredMaxTokens;

    if (typeof maxTokens === "number" && maxTokens !== session.preferredMaxTokens) {
      prisma.chatSession
        .update({
          where: { id: sessionId },
          data: { preferredMaxTokens: maxTokens },
        })
        .catch((e) => console.error("[Generation] Failed updating preferredMaxTokens:", e));
    }

    const { messages: compiledMessages } = assembleContext({
      character: session.character,
      userPersona: session.userPersona,
      pinnedMemories: session.memories,
      rollingSummary: session.rollingSummary,
      messages: session.messages,
      preferredMaxTokens: effectiveMaxTokens,
    });

    const userName = session.userPersona?.name || "User";
    const charName = session.character.name;

    // 3. Inject Continuation Directive
    compiledMessages.push({
      role: "user",
      content: `[Directive: Continue your previous response or advance the scene and dialogue naturally as ${charName}. Progress the narrative, your thoughts, physical reactions, or spoken dialogue. Do not repeat previous sentences or speak for ${userName}.]`,
    });

    // 4. Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    const stopTokens = [
      `\n${userName}:`,
      `\n\n${userName}:`,
      `\nUser:`,
      `\n\nUser:`,
      `\n{{user}}:`,
      `\n\n{{user}}:`,
    ];

    // 5. Stream from LM Studio
    let assistantFullText = "";
    const startTime = performance.now();

    try {
      assistantFullText = await lmStudioClient.streamChat({
        messages: compiledMessages,
        maxTokens: effectiveMaxTokens,
        model,
        stop: stopTokens,
        signal: abortController.signal,
        onToken: (token) => {
          res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
        },
      });
    } catch (streamErr: any) {
      if (abortController.signal.aborted) {
        console.log("[Generation] Continuation stream aborted by client.");
        return;
      }
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: streamErr.message || "Failed during continuation stream",
        })}\n\n`
      );
      res.end();
      return;
    }

    const durationMs = Math.round(performance.now() - startTime);

    // 6. Sanitize and Save Assistant Response in DB
    const cleanedText = sanitizeAssistantResponse(assistantFullText, userName, charName);
    const assistantMsg = await prisma.message.create({
      data: {
        sessionId,
        sender: "assistant",
        orderIndex: assistantOrderIndex,
        swipes: serializeSwipes([cleanedText]),
        activeSwipeIndex: 0,
      },
    });

    logGenerationMetrics({
      sessionId,
      characterName: charName,
      orderIndex: assistantOrderIndex,
      isRegeneration: false,
      durationMs,
      promptLength: compiledMessages.reduce((sum, m) => sum + m.content.length, 0),
      outputLength: cleanedText.length,
    });

    // Send final completion message event
    res.write(
      `data: ${JSON.stringify({
        type: "done",
        message: { ...assistantMsg, swipes: [cleanedText] },
      })}\n\n`
    );
    res.end();

    // 7. Background: Async rolling summary check (non-blocking)
    checkAndTriggerRollingSummary(sessionId).catch((err) =>
      console.error("[Generation] Summary trigger error on continue:", err)
    );
  } catch (err: any) {
    next(err);
  }
});

// POST /api/generate/regenerate (Generate alternate swipe)
generationRouter.post("/regenerate", async (req, res, next) => {
  const { sessionId, messageId, maxTokens, model } = req.body;

  if (!sessionId || !messageId) {
    res.status(400).json({ error: "sessionId and messageId are required." });
    return;
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        character: true,
        userPersona: true,
        memories: true,
        messages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: "Chat session not found." });
      return;
    }

    const targetMsg = session.messages.find((m) => m.id === messageId);
    if (!targetMsg || targetMsg.sender !== "assistant") {
      res.status(400).json({ error: "Target assistant message not found." });
      return;
    }

    // Only include messages strictly BEFORE this assistant message in context
    const contextMessages = session.messages.filter(
      (m) => m.orderIndex < targetMsg.orderIndex
    );

    const effectiveMaxTokens =
      typeof maxTokens === "number" ? maxTokens : session.preferredMaxTokens;

    const { messages: compiledMessages } = assembleContext({
      character: session.character,
      userPersona: session.userPersona,
      pinnedMemories: session.memories,
      rollingSummary: session.rollingSummary,
      messages: contextMessages,
      preferredMaxTokens: effectiveMaxTokens,
    });

    const userName = session.userPersona?.name || "User";
    const charName = session.character.name;

    // If target message was a continuation (preceded by another assistant message), inject continuation directive
    const prevMsg = contextMessages[contextMessages.length - 1];
    if (prevMsg && prevMsg.sender === "assistant") {
      compiledMessages.push({
        role: "user",
        content: `[Directive: Continue your previous response or advance the scene and dialogue naturally as ${charName}. Progress the narrative, your thoughts, physical reactions, or spoken dialogue. Do not repeat previous sentences or speak for ${userName}.]`,
      });
    }

    // Setup SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    const currentSwipes = parseSwipes(targetMsg.swipes);
    const previousSwipe = currentSwipes[targetMsg.activeSwipeIndex] || currentSwipes[currentSwipes.length - 1] || "";

    // Gradually elevate temperature on repeated regenerations to promote distinct phrasing
    const dynamicTemperature = Math.min(0.8 + (currentSwipes.length - 1) * 0.05, 1.05);

    const stopTokens = [
      `\n${userName}:`,
      `\n\n${userName}:`,
      `\nUser:`,
      `\n\nUser:`,
      `\n{{user}}:`,
      `\n\n{{user}}:`,
    ];

    let newFullText = "";
    const startTime = performance.now();

    try {
      newFullText = await lmStudioClient.streamChat({
        messages: compiledMessages,
        maxTokens: effectiveMaxTokens,
        temperature: dynamicTemperature,
        model,
        stop: stopTokens,
        signal: abortController.signal,
        onToken: (token) => {
          res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
        },
      });
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            error: err.message || "Failed regenerating swipe",
          })}\n\n`
        );
      }
      res.end();
      return;
    }

    const durationMs = Math.round(performance.now() - startTime);

    // Append new sanitized swipe
    const cleanedSwipe = sanitizeAssistantResponse(newFullText, userName, charName);
    currentSwipes.push(cleanedSwipe);
    const newActiveIndex = currentSwipes.length - 1;

    // Calculate lexical overlap & opening action match
    const similarity = calculateJaccardSimilarity(cleanedSwipe, previousSwipe);
    const openingActionMatch = hasDuplicateOpeningAction(cleanedSwipe, previousSwipe);

    logGenerationMetrics({
      sessionId,
      characterName: charName,
      orderIndex: targetMsg.orderIndex,
      isRegeneration: true,
      swipeNumber: currentSwipes.length,
      durationMs,
      promptLength: compiledMessages.reduce((sum, m) => sum + m.content.length, 0),
      outputLength: cleanedSwipe.length,
      similarityScore: similarity,
      openingActionMatch,
    });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        swipes: serializeSwipes(currentSwipes),
        activeSwipeIndex: newActiveIndex,
      },
    });

    res.write(
      `data: ${JSON.stringify({
        type: "done",
        message: { ...updated, swipes: currentSwipes },
        metrics: {
          similarity,
          openingActionMatch,
          swipeNumber: currentSwipes.length,
        },
      })}\n\n`
    );
    res.end();
  } catch (err) {
    next(err);
  }
});
