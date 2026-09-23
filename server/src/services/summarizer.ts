import { prisma } from "../db.js";
import { lmStudioClient } from "./lmStudioClient.js";
import { extractActiveSwipe } from "./contextEngine.js";
import { config } from "../config.js";
import { CompactionStatus, MemoryEntryType } from "@prisma/client";

export async function checkAndTriggerRollingSummary(sessionId: string, force?: boolean): Promise<void> {
  let session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      character: true,
      messages: {
        where: { isDeleted: false },
        orderBy: { orderIndex: "asc" },
      },
      memoryEntries: {
        where: { type: MemoryEntryType.compacted },
        orderBy: { version: "desc" },
        take: 1
      }
    },
  });

  if (!session) return;

  const messages = session.messages;

  // Find where the uncompacted region starts
  let uncompactedMessages = messages;
  if (session.compactionBoundaryMessageId) {
    const boundaryIndex = messages.findIndex(m => m.id === session.compactionBoundaryMessageId);
    if (boundaryIndex !== -1) {
      uncompactedMessages = messages.slice(boundaryIndex + 1);
    }
  } else if (session.summarizedUpToIndex > 0) { // Legacy fallback
    uncompactedMessages = messages.filter(m => m.orderIndex >= session.summarizedUpToIndex);
  }

  // Token estimate from ledger (with fallback)
  const unsummarizedTokenEstimate = uncompactedMessages.reduce((sum, msg) => {
    const tokens = msg.tokenCount || Math.ceil(extractActiveSwipe(msg).length / 4);
    return sum + tokens;
  }, 0);
  const softThreshold = 3000;

  if (!force && unsummarizedTokenEstimate < softThreshold) {
    return; // Not enough pressure
  }

  // Determine the eligible range to compact
  // We want to compact a chunk of messages that is AT MOST ~2500 tokens to avoid exceeding the model's context window.
  // And we want to leave the most recent 1000 tokens UNCOMPACTED.
  
  let messagesToSummarize = [];
  
  // First, find the boundary of the uncompacted region (last 1000 tokens)
  let safeIndex = uncompactedMessages.length - 1;
  let retainedTokens = 0;
  for (let i = uncompactedMessages.length - 1; i >= 0; i--) {
    const msg = uncompactedMessages[i];
    const tokens = msg.tokenCount || Math.ceil(extractActiveSwipe(msg).length / 4);
    retainedTokens += tokens;
    if (retainedTokens > 1000) {
      safeIndex = i; // Up to this index is safe to compact
      break;
    }
  }

  // If even all uncompacted messages combined are less than 1000 tokens but we forced compaction,
  // summarize everything except the very last message.
  if (force && retainedTokens <= 1000 && uncompactedMessages.length >= 2) {
    safeIndex = uncompactedMessages.length - 2;
  }

  // Now, collect messages from the beginning (index 0) up to safeIndex, but stop if chunkTokens exceeds 2500
  let chunkTokens = 0;
  for (let i = 0; i <= safeIndex; i++) {
    const msg = uncompactedMessages[i];
    const tokens = msg.tokenCount || Math.ceil(extractActiveSwipe(msg).length / 4);
    
    if (chunkTokens + tokens > 2500 && messagesToSummarize.length >= 2) {
      break; // We've gathered enough for one chunk
    }
    
    messagesToSummarize.push(msg);
    chunkTokens += tokens;
  }

  if (messagesToSummarize.length < 2) {
    return; // Nothing meaningful to summarize
  }

  // Update status to pending
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { compactionStatus: CompactionStatus.pending }
  });

  try {
    // Build the excerpt to summarize
    const conversationTranscript = messagesToSummarize
      .map((m) => {
        const sender = m.sender === "user" ? "User" : session.character.name;
        const text = extractActiveSwipe(m);
        return `${sender}: ${text}`;
      })
      .join("\n\n");

    const previousSummary = session.memoryEntries[0]?.content || session.rollingSummary || "None.";

    const prompt = `You are an expert narrative chronicler. Below is a past segment of a roleplay conversation between ${session.character.name} and the user.\n\n` +
      `Existing summary of prior events:\n${previousSummary}\n\n` +
      `New conversation excerpt to integrate:\n${conversationTranscript}\n\n` +
      `Task: Provide a concise, coherent chronological narrative summary (bullet points or short paragraph) capturing the key facts, developments, secrets, and emotional beats from this conversation. Keep it concise so it fits into memory. Do not include meta commentary or roleplay preamble.`;

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { compactionStatus: CompactionStatus.compacting }
    });

    const summaryResult = await lmStudioClient.complete({
      messages: [
        {
          role: "system",
          content: "You are a concise, factual narrative memory summarizer.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 350,
      temperature: 0.3,
      // aiConfig is purposely omitted here so it defaults to server config
    });

    if (summaryResult && summaryResult.trim()) {
      const newSummaryContent = summaryResult.trim();

      const newBoundaryMessageId = messagesToSummarize[messagesToSummarize.length - 1].id;
      const sourceTokenEstimate = messagesToSummarize.reduce((sum, msg) => sum + (msg.tokenCount || 0), 0);

      // Calculate summary token count (rough estimate using length/4 if tokenCounter not imported, but let's just use string length as fallback for now or import it)
      const summaryTokenEstimate = Math.ceil(newSummaryContent.length / 4);
      const newVersion = (session.memoryEntries[0]?.version || 0) + 1;

      // ATOMIC COMMIT: Persist MemoryEntry + boundary + status in single transaction
      await prisma.$transaction([
        prisma.memoryEntry.create({
          data: {
            sessionId,
            type: MemoryEntryType.compacted,
            sourceStartMessageId: messagesToSummarize[0].id,
            sourceEndMessageId: newBoundaryMessageId,
            sourceMessageCount: messagesToSummarize.length,
            sourceTokenEstimate,
            summaryTokenEstimate,
            version: newVersion,
            content: newSummaryContent,
          }
        }),
        prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            compactionBoundaryMessageId: newBoundaryMessageId,
            compactionStatus: CompactionStatus.idle,
            lastCompactedAt: new Date(),
            lastCompactionError: null,
            // Keep rollingSummary for legacy compat
            rollingSummary: newSummaryContent
          }
        })
      ]);

      console.log(`[Summarizer] Successfully committed atomic compaction for session ${sessionId}. Boundary: ${newBoundaryMessageId}`);
    } else {
      throw new Error("Empty summary result");
    }
  } catch (err: any) {
    console.error("[Summarizer] Error during background summarization:", err);
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        compactionStatus: CompactionStatus.failed,
        lastCompactionError: err.message || "Unknown error"
      }
    });
    throw err;
  }
}
