import { prisma } from "../db.js";
import { lmStudioClient } from "./lmStudioClient.js";
import { extractActiveSwipe } from "./contextEngine.js";
import { config } from "../config.js";

export async function checkAndTriggerRollingSummary(sessionId: string): Promise<void> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        character: true,
        messages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!session) return;

    const messages = session.messages;
    const startIndex = session.summarizedUpToIndex || 0;
    const unsummarized = messages.filter((m) => m.orderIndex >= startIndex);

    // Keep the most recent 10 messages untouched in active sliding memory
    const slidingBuffer = config.summaryThreshold;
    if (unsummarized.length <= slidingBuffer) {
      return; // Not enough messages outside immediate context yet
    }

    const messagesToSummarize = unsummarized.slice(
      0,
      unsummarized.length - slidingBuffer
    );

    if (messagesToSummarize.length < config.summaryBatchSize) {
      return; // Wait until batch size threshold is reached
    }

    // Build the excerpt to summarize
    const conversationTranscript = messagesToSummarize
      .map((m) => {
        const sender = m.sender === "user" ? "User" : session.character.name;
        const text = extractActiveSwipe(m);
        return `${sender}: ${text}`;
      })
      .join("\n\n");

    const prompt = `You are an expert narrative chronicler. Below is a past segment of a roleplay conversation between ${session.character.name} and the user.\n\n` +
      `Existing summary of prior events:\n${session.rollingSummary || "None."}\n\n` +
      `New conversation excerpt to integrate:\n${conversationTranscript}\n\n` +
      `Task: Provide a concise, coherent chronological narrative summary (bullet points or short paragraph) capturing the key facts, developments, secrets, and emotional beats from this conversation. Keep it concise so it fits into memory. Do not include meta commentary or roleplay preamble.`;

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
    });

    if (summaryResult && summaryResult.trim()) {
      const updatedSummary = session.rollingSummary
        ? `${session.rollingSummary.trim()}\n${summaryResult.trim()}`
        : summaryResult.trim();

      const newSummarizedIndex =
        messagesToSummarize[messagesToSummarize.length - 1].orderIndex + 1;

      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          rollingSummary: updatedSummary,
          summarizedUpToIndex: newSummarizedIndex,
        },
      });

      console.log(
        `[Summarizer] Successfully updated summary for session ${sessionId} up to index ${newSummarizedIndex}`
      );
    }
  } catch (err) {
    console.error("[Summarizer] Error during background summarization:", err);
  }
}
