import { prisma } from "../db.js";
import { checkAndTriggerRollingSummary } from "./summarizer.js";
import { CompactionStatus } from "@prisma/client";

export class MemoryService {
  async getStatus(sessionId: string) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        }
      }
    });

    if (!session) {
      throw new Error("Session not found");
    }

    let uncompactedMessages = session.messages;
    if (session.compactionBoundaryMessageId) {
      const boundaryIndex = session.messages.findIndex(m => m.id === session.compactionBoundaryMessageId);
      if (boundaryIndex !== -1) {
        uncompactedMessages = session.messages.slice(boundaryIndex + 1);
      }
    } else if (session.summarizedUpToIndex > 0) {
      uncompactedMessages = session.messages.filter(m => m.orderIndex >= session.summarizedUpToIndex);
    }

    // Include token fallback estimate
    const unsummarizedTokenEstimate = uncompactedMessages.reduce((sum, msg) => {
      let tokens = msg.tokenCount;
      if (!tokens) {
        const content = msg.swipes?.[msg.activeSwipeIndex || 0] || "";
        tokens = Math.ceil(content.length / 4);
      }
      return sum + tokens;
    }, 0);

    const memoryPressure = Math.min(unsummarizedTokenEstimate / 3000, 1.0);

    return {
      compactionStatus: session.compactionStatus || CompactionStatus.idle,
      memoryPressure,
      unsummarizedMessageCount: uncompactedMessages.length,
      unsummarizedTokenEstimate
    };
  }

  async compact(sessionId: string, options?: { force?: boolean }) {
    await checkAndTriggerRollingSummary(sessionId, options?.force);
    return { status: "completed" };
  }
}

export const memoryService = new MemoryService();
