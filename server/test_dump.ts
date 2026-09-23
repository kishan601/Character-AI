import { prisma } from "./src/db.js";

async function dump() {
  const session = await prisma.chatSession.findFirst({
    include: {
      messages: {
        where: { isDeleted: false },
        orderBy: { orderIndex: "asc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!session) return;
  for (const m of session.messages) {
    console.log(`[${m.orderIndex}] ${m.sender} - ${m.id} - ${JSON.stringify(m.swipes).slice(0, 50)}`);
  }
}

dump().catch(console.error).finally(() => prisma.$disconnect());
