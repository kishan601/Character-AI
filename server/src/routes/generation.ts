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
  const { sessionId, userMessage, maxTokens, model, goOn, aiConfig } = req.body;
  const isGoOn = Boolean(goOn);

  if (!sessionId || (!isGoOn && !userMessage?.trim())) {
    res.status(400).json({ error: "sessionId and userMessage are required (unless goOn is true)." });
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

    // 1. Determine next orderIndex & handle user message
    const lastMsg = session.messages[session.messages.length - 1];
    let userMsg: any = null;
    let assistantOrderIndex: number;
    let allMessagesForPrompt = session.messages;

    if (!isGoOn && userMessage?.trim()) {
      const userOrderIndex = (lastMsg ? lastMsg.orderIndex : -1) + 1;
      userMsg = await prisma.message.create({
        data: {
          sessionId,
          sender: "user",
          orderIndex: userOrderIndex,
          swipes: serializeSwipes([userMessage.trim()]),
          activeSwipeIndex: 0,
        },
      });
      allMessagesForPrompt = [...session.messages, userMsg];
      assistantOrderIndex = userOrderIndex + 1;
    } else {
      assistantOrderIndex = (lastMsg ? lastMsg.orderIndex : -1) + 1;
    }

    // 2. Assemble Context
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

    const userName = session.userPersona?.name || "User";
    const charName = session.character.name;

    // For "Go on", append a transient continuation instruction for the LLM (not stored in DB)
    if (isGoOn) {
      compiledMessages.push({
        role: "user",
        content: `(Continue the narrative, scene, and actions as ${charName} from the current point. Stay strictly in character and describe the next events, dialogue, and actions. Do not speak or act for ${userName}.)`,
      });
    }

    // 3. Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    // Send user message confirmation event if a user message was created
    if (userMsg) {
      res.write(
        `data: ${JSON.stringify({
          type: "user_message",
          message: { ...userMsg, swipes: [userMessage.trim()] },
        })}\n\n`
      );
    }

    const stopTokens = [
      `\n${userName}:`,
      `\n\n${userName}:`,
      `\nUser:`,
      `\n\nUser:`,
      `\n{{user}}:`,
      `\n\n{{user}}:`,
    ];

    // 4. Stream from LM Studio
    let assistantFullText = "";
    const startTime = performance.now();

    try {
      assistantFullText = await lmStudioClient.streamChat({
        messages: compiledMessages,
        maxTokens: effectiveMaxTokens,
        temperature: 0.85,
        topP: 0.92,
        presencePenalty: 0.2,
        frequencyPenalty: 0.2,
        seed: Math.floor(Math.random() * 100000000),
        model,
        aiConfig,
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

    // 5. Sanitize and Save Assistant Response in DB
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
        userMessage: userMsg ? { ...userMsg, swipes: [userMessage.trim()] } : null,
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

// POST /api/generate/regenerate (Generate alternate swipe)
generationRouter.post("/regenerate", async (req, res, next) => {
  const { sessionId, messageId, maxTokens, model, aiConfig } = req.body;

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

    // Setup SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    const userName = session.userPersona?.name || "User";
    const charName = session.character.name;
    const currentSwipes = parseSwipes(targetMsg.swipes);
    const previousSwipe = currentSwipes[targetMsg.activeSwipeIndex] || currentSwipes[currentSwipes.length - 1] || "";

    // Elevate temperature, penalties, and provide a fresh random seed on each regeneration
    const dynamicTemperature = Math.min(0.85 + (currentSwipes.length - 1) * 0.08, 1.15);
    const dynamicPresencePenalty = Math.min(0.25 + (currentSwipes.length - 1) * 0.1, 0.65);
    const dynamicFrequencyPenalty = Math.min(0.2 + (currentSwipes.length - 1) * 0.08, 0.55);
    const dynamicTopP = Math.max(0.92 - (currentSwipes.length - 1) * 0.02, 0.82);
    const dynamicSeed = Math.floor(Math.random() * 100000000);

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
        topP: dynamicTopP,
        presencePenalty: dynamicPresencePenalty,
        frequencyPenalty: dynamicFrequencyPenalty,
        seed: dynamicSeed,
        model,
        aiConfig,
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
