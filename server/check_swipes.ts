import { prisma } from "./src/db.js";

async function clean() {
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
    if (m.sender !== "assistant") continue;
    
    let parsed: string[] = [];
    try {
      parsed = JSON.parse(m.swipes);
    } catch {
      continue;
    }

    let modified = false;
    const cleanSwipes = parsed.filter(s => s.trim() !== "");
    
    if (cleanSwipes.length < parsed.length && cleanSwipes.length > 0) {
      console.log(`Message ${m.orderIndex} (${m.id}) had ${parsed.length} swipes, cleaned to ${cleanSwipes.length}`);
      
      let newActiveIndex = m.activeSwipeIndex;
      if (newActiveIndex >= cleanSwipes.length) {
        newActiveIndex = cleanSwipes.length - 1;
      }
      
      await prisma.message.update({
        where: { id: m.id },
        data: {
          swipes: JSON.stringify(cleanSwipes),
          activeSwipeIndex: newActiveIndex
        }
      });
      console.log(`  Updated activeSwipeIndex to ${newActiveIndex}`);
    } else if (cleanSwipes.length === 0) {
      console.log(`Message ${m.orderIndex} has 0 valid swipes! It's completely blank.`);
    }
  }
}

clean().catch(console.error).finally(() => prisma.$disconnect());
