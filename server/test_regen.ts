import { prisma } from "./src/db.js";
import { assembleContext } from "./src/services/contextEngine.js";

async function test() {
  const session = await prisma.chatSession.findFirst({
    include: {
      character: true,
      userPersona: true,
      memories: true,
      messages: {
        where: { isDeleted: false },
        orderBy: { orderIndex: "asc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!session) return console.log("No session");

  const lastAssistantMsg = session.messages.reverse().find(m => m.sender === "assistant");
  if (!lastAssistantMsg) return console.log("No assistant msg");

  console.log("Target Msg Content:", lastAssistantMsg.swipes);
  console.log("Target Msg Order:", lastAssistantMsg.orderIndex);

  // Re-sort correctly because we reversed
  session.messages.reverse();
  const contextMessages = session.messages.filter(m => m.orderIndex < lastAssistantMsg.orderIndex);

  const assembly = assembleContext({
    character: session.character,
    userPersona: session.userPersona,
    pinnedMemories: session.memories,
    rollingSummary: session.rollingSummary,
    messages: contextMessages,
    preferredMaxTokens: 400
  });

  console.log("--- PROMPT MESSAGES ---");
  assembly.messages.forEach(m => {
    console.log(`[${m.role}] ${m.content.slice(0, 100).replace(/\n/g, "\\n")}...`);
  });
}

test().catch(console.error).finally(() => prisma.$disconnect());
